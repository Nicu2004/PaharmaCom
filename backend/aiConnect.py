from ollama import Client

client = Client(host='http://10.123.4.5:11434', headers={'x-some-header': 'some-value'})

def analyze_symptoms(text: str) -> str:
    response = client.chat(
        model="qwen3.5:4b",
        messages=[
            {
                "role": "system",
                "content": (
                    "Summarize the symptoms reported by the user in Romanian. "
                    "Do not diagnose, recommend medicines, or invent details."
                ),
            },
            {"role": "user", "content": text},
        ],
    )
    return response.message.content or ""
  
  
if __name__ == "__main__":
  print(analyze_symptoms("Am tuse de doua zile."))
