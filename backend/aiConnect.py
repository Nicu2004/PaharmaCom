from typing import List

from ollama import Client

client = Client(host='http://127.0.0.1:11434/', headers={'bearer': 'some-value'})


def analyze_symptoms(text: str, images: List[str]) -> str:
    # 1. Strip the HTML data URI prefix from the base64 strings
    cleaned_images = []
    if images:
        for img in images:
            if "," in img:
                cleaned_images.append(img.split(",")[1])
            else:
                cleaned_images.append(img)

    # 2. Construct the user message
    user_message = {
        "role": "user",
        "content": text
    }

    # 3. Attach images only if they exist
    if cleaned_images:
        user_message["images"] = cleaned_images

    # 4. Call the AI
    response = client.chat(
        model="gemma3:12b",
        messages=[
            {
                "role": "system",
                "content": (
                    "Summarize the symptoms reported by the user in Romanian. "
                    "Do not diagnose, recommend medicines, or invent details."
                ),
            },
            user_message,  # Insert the properly formatted dictionary here
        ],
    )
    return response.message.content or ""
  
  
if __name__ == "__main__":
  print(analyze_symptoms("Am tuse de doua zile.", []))

