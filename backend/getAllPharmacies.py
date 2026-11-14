import requests
import json


def fetch_live_pharmacies_timisoara():
    print("Fetching live pharmacy data for Timișoara from OpenStreetMap...")

    overpass_url = "http://overpass-api.de/api/interpreter"
    overpass_query = """
    [out:json];
    area["name"="Timișoara"]->.searchArea;
    node["amenity"="pharmacy"](area.searchArea);
    out center;
    """

    # THE FIX: Add explicit headers to bypass the bot blocker
    headers = {
        "User-Agent": "PharmaCom_Hackathon_Project/1.0 (Timisoara Student Project)",
        "Accept": "application/json"
    }

    try:
        # Pass the headers into the POST request
        response = requests.post(overpass_url, data={'data': overpass_query}, headers=headers)
        response.raise_for_status()
        data = response.json()

        pharmacies_json = []

        for index, element in enumerate(data.get('elements', [])):
            tags = element.get('tags', {})

            name = tags.get('name', 'Farmacie (Nume necunoscut)')

            street = tags.get('addr:street', '')
            housenumber = tags.get('addr:housenumber', '')
            full_street = f"{street} {housenumber}".strip()

            if not full_street:
                full_street = "Adresă indisponibilă"

            pharmacy = {
                "id": index + 1,
                "name": name,
                "street": full_street,
                "lat": element.get('lat'),
                "lng": element.get('lon'),
                "isOpen": True,
                "status": "Deschis (Preluat din API)"
            }

            pharmacies_json.append(pharmacy)

        return pharmacies_json

    except requests.exceptions.RequestException as e:
        print(f"Error fetching data: {e}")
        # Print the raw text if the server returns an error message body
        if hasattr(e, 'response') and e.response is not None:
            print(f"Server response: {e.response.text}")
        return []


if __name__ == "__main__":
    live_pharmacies = fetch_live_pharmacies_timisoara()

    print(f"Successfully found {len(live_pharmacies)} pharmacies in Timișoara.")

    if live_pharmacies:
        output_filename = "timisoara_pharmacies_live.json"
        with open(output_filename, 'w', encoding='utf-8') as f:
            json.dump(live_pharmacies, f, ensure_ascii=False, indent=2)

        print(f"Data saved to {output_filename}")