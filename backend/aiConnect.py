
from ollama import Client

client = Client(host='http://10.123.4.5:11434', headers={'x-some-header': 'some-value'})

def analyze_symptoms(text: str) -> str:
    response = client.chat(
        model="gemma3:12b",
        messages=[
            {
                "role": "system",
                "content": (
                    "Summarize the symptoms reported by the user in Romanian with a clean format and without English translation."
                    "Make a diagnose, recommend medicines, or invent details."
                ),
            },
            {"role": "user", "content": text},

        ],
        options = {
            'num_predict': 1000,
            'num_ctx': 2048
        }
    )
    return response.message.content or ""
  
  
if __name__ == "__main__":
  print(analyze_symptoms("Am tuse de doua zile."))

