# Medical Certificates API - Test Commands

## Setup
1. Ensure migration is run: `backend/migrations/20250122_add_medical_certificates.sql`
2. Ensure upload directory exists: `backend/uploads/medical_certificates/`
3. Login first to get session cookie

## 1. Upload Medical Certificate (POST)

```bash
# Login first
curl -X POST http://localhost:8080/backend/api/auth \
  -H "Content-Type: application/json" \
  -d '{"action":"login","username":"admin","password":"010203"}' \
  -c cookies.txt

# Upload certificate (multipart/form-data)
curl -X POST http://localhost:8080/backend/api/medical_certificates \
  -b cookies.txt \
  -F "worker_id=worker-2" \
  -F "date=2025-01-22" \
  -F "planning_entry_id=plan-123" \
  -F "file=@/path/to/certificate.pdf" \
  -F "note=Test certificate"
```

## 2. List Medical Certificates (GET)

```bash
# Get all certificates
curl -X GET "http://localhost:8080/backend/api/medical_certificates" \
  -b cookies.txt

# Filter by worker
curl -X GET "http://localhost:8080/backend/api/medical_certificates?worker_id=worker-2" \
  -b cookies.txt

# Filter by date range
curl -X GET "http://localhost:8080/backend/api/medical_certificates?date_from=2025-01-01&date_to=2025-01-31" \
  -b cookies.txt

# Filter by planning entry
curl -X GET "http://localhost:8080/backend/api/medical_certificates?planning_entry_id=plan-123" \
  -b cookies.txt
```

## 3. Download Medical Certificate (GET)

```bash
# Download certificate (replace CERTIFICATE_ID)
curl -X GET "http://localhost:8080/backend/api/medical_certificates/CERTIFICATE_ID/download" \
  -b cookies.txt \
  -o downloaded_certificate.pdf
```

## 4. Delete Medical Certificate (DELETE)

```bash
# Delete certificate (replace CERTIFICATE_ID)
curl -X DELETE "http://localhost:8080/backend/api/medical_certificates/CERTIFICATE_ID" \
  -b cookies.txt
```

## Smoke Test Steps

1. **Upload Test:**
   - Create planning entry with category KRANK
   - Upload PDF file
   - Verify certificate appears in list
   - Verify planning entry shows "Zeugnis vorhanden"

2. **Download Test:**
   - Click download link in Verwaltung → Arztzeugnisse
   - Verify file downloads correctly

3. **Permission Test:**
   - Login as Worker (not admin)
   - Verify only own certificates visible
   - Verify cannot delete other certificates

4. **Validation Test:**
   - Try to save KRANK planning without file → should fail
   - Try to upload invalid file type → should fail
   - Try to upload file > 10MB → should fail

5. **Replace Test:**
   - Edit existing KRANK planning entry
   - Upload new certificate
   - Verify old certificate is replaced



