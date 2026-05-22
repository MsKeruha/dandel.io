import urllib.request
import json

def test_osrm():
    start = [50.4501, 30.5234]
    end = [49.8397, 24.0297]
    
    mid_lat = (start[0] + end[0]) / 2 + 0.1
    mid_lng = (start[1] + end[1]) / 2 - 0.2
    
    waypoints = f"{start[1]},{start[0]};{mid_lng},{mid_lat};{end[1]},{end[0]}"
    url = f"https://router.project-osrm.org/route/v1/driving/{waypoints}?overview=full&geometries=geojson"
    
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode())
            routes = data.get("routes", [])
            print(f"Found {len(routes)} routes")
            if routes:
                print(f"Route 0: {routes[0]['distance']}m")
    except Exception as e:
        print(f"Error: {e}")

test_osrm()
