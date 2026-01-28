/**
 * Geocoding & Address Autocomplete
 * Using OpenStreetMap Nominatim API (free, no API key required)
 */

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'TechnoovaApp/1.0';

/**
 * Search addresses using Nominatim
 * @param {string} query - Search query
 * @returns {Promise<Array>} Array of address results
 */
export async function searchAddresses(query) {
  if (!query || query.length < 3) return [];
  
  try {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      addressdetails: 1,
      limit: 5,
      countrycodes: 'ch', // Switzerland only
      'accept-language': 'de'
    });
    
    const response = await fetch(`${NOMINATIM_BASE_URL}/search?${params}`, {
      headers: {
        'User-Agent': USER_AGENT
      }
    });
    
    if (!response.ok) {
      throw new Error('Geocoding request failed');
    }
    
    const results = await response.json();
    
    return results.map(result => ({
      display_name: result.display_name,
      address: {
        road: result.address?.road || '',
        house_number: result.address?.house_number || '',
        postcode: result.address?.postcode || '',
        city: result.address?.city || result.address?.town || result.address?.village || '',
        country: result.address?.country || 'Schweiz'
      },
      lat: parseFloat(result.lat),
      lon: parseFloat(result.lon),
      osm_id: result.osm_id,
      formatted: formatAddress(result.address)
    }));
  } catch (error) {
    console.error('Geocoding error:', error);
    return [];
  }
}

/**
 * Format address for display
 */
function formatAddress(address) {
  const parts = [];
  
  if (address.road) {
    let street = address.road;
    if (address.house_number) street += ' ' + address.house_number;
    parts.push(street);
  }
  
  if (address.postcode || address.city || address.town || address.village) {
    let cityPart = '';
    if (address.postcode) cityPart += address.postcode + ' ';
    cityPart += address.city || address.town || address.village || '';
    parts.push(cityPart.trim());
  }
  
  return parts.join(', ');
}

/**
 * Debounce function for search input
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

