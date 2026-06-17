import requests
import json

def test_upi_graph_api():
    url = "http://localhost:5000/api/upi-graph"
    try:
        response = requests.get(url)
        if response.status_code == 200:
            data = response.json()
            print(f"Success: Status 200")
            print(f"Nodes count: {len(data.get('nodes', []))}")
            print(f"Edges count: {len(data.get('edges', []))}")
            if len(data.get('nodes', [])) > 0:
                print("First node sample:", json.dumps(data['nodes'][0], indent=2))
        else:
            print(f"Failed: Status {response.status_code}")
            print(response.text)
    except Exception as e:
        print(f"Error connecting to backend: {e}")

if __name__ == "__main__":
    test_upi_graph_api()
