<?php
/**
 * Team Service
 * Single Source of Truth für Team-Zuordnungen
 * Nutzt team_members als primäre Quelle
 */

class TeamService {
    private $db;
    
    public function __construct($db) {
        $this->db = $db;
    }
    
    /**
     * Fügt Worker zu Team hinzu (Single Source of Truth: team_members)
     */
    public function addWorkerToTeam($teamId, $workerId, $setAsPrimary = false) {
        $this->db->beginTransaction();
        
        try {
            // 1. Prüfe ob Team existiert und aktiv ist
            $stmt = $this->db->prepare("SELECT id, is_active FROM teams WHERE id = ?");
            $stmt->execute([$teamId]);
            $team = $stmt->fetch();
            
            if (!$team) {
                throw new Exception('Team existiert nicht');
            }
            
            if (!$team['is_active']) {
                throw new Exception('Team ist nicht aktiv');
            }
            
            // 2. Prüfe ob Worker existiert
            $stmt = $this->db->prepare("SELECT id FROM workers WHERE id = ?");
            $stmt->execute([$workerId]);
            if (!$stmt->fetch()) {
                throw new Exception('Worker existiert nicht');
            }
            
            // 3. Füge zu team_members hinzu (UNIQUE constraint verhindert Duplikate)
            $stmt = $this->db->prepare("INSERT IGNORE INTO team_members (team_id, worker_id) VALUES (?, ?)");
            $stmt->execute([$teamId, $workerId]);
            
            // 4. Optional: Setze als primary_team_id
            if ($setAsPrimary) {
                $stmt = $this->db->prepare("UPDATE workers SET primary_team_id = ? WHERE id = ?");
                $stmt->execute([$teamId, $workerId]);
            }
            
            $this->db->commit();
            return true;
            
        } catch (Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }
    
    /**
     * Entfernt Worker aus Team
     */
    public function removeWorkerFromTeam($teamId, $workerId) {
        $this->db->beginTransaction();
        
        try {
            // 1. Entferne aus team_members
            $stmt = $this->db->prepare("DELETE FROM team_members WHERE team_id = ? AND worker_id = ?");
            $stmt->execute([$teamId, $workerId]);
            
            // 2. Wenn primary_team_id = teamId, setze auf NULL
            $stmt = $this->db->prepare("UPDATE workers SET primary_team_id = NULL WHERE id = ? AND primary_team_id = ?");
            $stmt->execute([$workerId, $teamId]);
            
            $this->db->commit();
            return true;
            
        } catch (Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }
    
    /**
     * Setzt Primary Team für Worker
     */
    public function setPrimaryTeam($workerId, $teamId) {
        // Prüfe ob Worker in Team ist
        $stmt = $this->db->prepare("SELECT COUNT(*) as count FROM team_members WHERE worker_id = ? AND team_id = ?");
        $stmt->execute([$workerId, $teamId]);
        $result = $stmt->fetch();
        
        if ((int)$result['count'] === 0) {
            throw new Exception('Worker ist nicht Mitglied des Teams');
        }
        
        $stmt = $this->db->prepare("UPDATE workers SET primary_team_id = ? WHERE id = ?");
        $stmt->execute([$teamId, $workerId]);
        return true;
    }
    
    /**
     * Holt Team-Mitglieder (aus team_members)
     */
    public function getTeamMembers($teamId) {
        $stmt = $this->db->prepare("
            SELECT w.id 
            FROM workers w
            INNER JOIN team_members tm ON w.id = tm.worker_id
            WHERE tm.team_id = ?
        ");
        $stmt->execute([$teamId]);
        return $stmt->fetchAll(PDO::FETCH_COLUMN);
    }
    
    /**
     * Aktualisiert Team-Mitglieder (Batch)
     */
    public function updateTeamMembers($teamId, $memberIds) {
        $this->db->beginTransaction();
        
        try {
            // 1. Entferne alle bestehenden Mitglieder
            $stmt = $this->db->prepare("DELETE FROM team_members WHERE team_id = ?");
            $stmt->execute([$teamId]);
            
            // 2. Füge neue Mitglieder hinzu
            $stmt = $this->db->prepare("INSERT INTO team_members (team_id, worker_id) VALUES (?, ?)");
            foreach ($memberIds as $workerId) {
                $stmt->execute([$teamId, $workerId]);
            }
            
            // 3. Setze primary_team_id auf NULL für Workers die nicht mehr im Team sind
            $placeholders = implode(',', array_fill(0, count($memberIds), '?'));
            $stmt = $this->db->prepare("
                UPDATE workers 
                SET primary_team_id = NULL 
                WHERE primary_team_id = ? 
                  AND id NOT IN ($placeholders)
            ");
            $params = array_merge([$teamId], $memberIds);
            $stmt->execute($params);
            
            $this->db->commit();
            return true;
            
        } catch (Exception $e) {
            $this->db->rollBack();
            throw $e;
        }
    }
}



