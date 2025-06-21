'use client'

import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { Ride } from './RideCard' // Assuming Ride type is exported from RideCard
import { format } from 'date-fns'

// Fix for default Leaflet icon paths in Next.js/Webpack
// Define a type for the prototype to avoid using 'any'
type LeafletIconPrototype = L.Icon.Default & { _getIconUrl?: () => string };

delete (L.Icon.Default.prototype as LeafletIconPrototype)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

interface MapViewProps {
    rides: Ride[];
}

// Helper function to parse coordinates
const parseCoords = (coordsStr: string | null | undefined): [number, number] | null => {
    if (!coordsStr) return null;
    const parts = coordsStr.split(',').map(s => s.trim());
    if (parts.length !== 2) return null;
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    if (isNaN(lat) || isNaN(lng)) return null;
    return [lat, lng];
};

// Helper function to get initials for fallback avatar (similar to RideCard)
const getInitials = (name: string | null | undefined): string => {
    return name?.charAt(0).toUpperCase() || '?';
};

export default function MapView({ rides }: MapViewProps) {
    // Calculate a center point - simple average for now, could be more sophisticated
    let centerLat = 51.505; // Default center (London)
    let centerLng = -0.09;
    let zoom = 8; // Default zoom
    const validCoords: [number, number][] = [];

    rides.forEach(ride => {
        const coords = parseCoords(ride.starting_point_coords);
        if (coords) {
            validCoords.push(coords);
        }
    });

    if (validCoords.length > 0) {
        centerLat = validCoords.reduce((sum, coords) => sum + coords[0], 0) / validCoords.length;
        centerLng = validCoords.reduce((sum, coords) => sum + coords[1], 0) / validCoords.length;
        // Basic zoom adjustment based on number of points (very rough)
        if (validCoords.length === 1) zoom = 13;
        else if (validCoords.length > 5) zoom = 6;
    }

    return (
        <MapContainer center={[centerLat, centerLng]} zoom={zoom} scrollWheelZoom={true} style={{ height: '600px', width: '100%' }}>
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {rides.map(ride => {
                const coords = parseCoords(ride.starting_point_coords);
                if (!coords) return null; // Skip rides without valid coords

                const radius = ride.distance_km ? (ride.distance_km / 2) * 1000 : 5000; // Default 5km radius if distance missing
                const creatorProfile = ride.profiles;
                const creatorName = creatorProfile?.first_name || 'Someone';
                const creatorAvatarUrl = creatorProfile?.avatar_url;
                const formattedTime = ride.start_time ? format(new Date(ride.start_time), 'Pp') : 'N/A';

                // Create a custom DivIcon using the avatar
                const iconHtml = `
                    <div style="width: 32px; height: 32px; border-radius: 50%; overflow: hidden; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.5); background-color: #ccc;">
                        ${creatorAvatarUrl ? 
                            `<img src="${creatorAvatarUrl}" alt="${creatorName}" style="width: 100%; height: 100%; object-fit: cover;" />` : 
                            `<span style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; font-size: 14px; font-weight: bold; color: white;">${getInitials(creatorName)}</span>`
                        }
                    </div>
                `;

                const customIcon = L.divIcon({
                    html: iconHtml,
                    className: '', // Important to clear default Leaflet styles if needed
                    iconSize: [32, 32], // Size of the div
                    iconAnchor: [16, 16], // Point of the icon which will correspond to marker's location
                    popupAnchor: [0, -16] // Point from which the popup should open relative to the iconAnchor
                });

                return (
                    <Marker key={ride.id} position={coords} icon={customIcon}>
                        <Popup>
                            <b>{creatorName}</b> wants to ride {ride.bike_type || 'any bike'}.<br />
                            Distance: {ride.distance_km || '?'} km<br />
                            Starting Point: {ride.starting_point_address || 'N/A'}<br />
                            Time: {formattedTime}
                        </Popup>
                        <Circle 
                            center={coords} 
                            radius={radius} 
                            pathOptions={{ color: 'orange', fillColor: 'orange', fillOpacity: 0.1 }} 
                        />
                    </Marker>
                );
            })}
        </MapContainer>
    );
} 