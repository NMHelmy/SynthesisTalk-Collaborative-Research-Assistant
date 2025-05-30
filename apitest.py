import requests

response = requests.get(
    "https://ngullama.femtoid.com/v1/models",
    headers={"Authorization": "Bearer ngu-CQo6jVAeHt"}
)

print(response.json())
