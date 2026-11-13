from ollama import Client

client = Client(host='http://10.123.4.5:11434', headers={'x-some-header': 'some-value'})
user_input = input("Enter your question: ")
response = client.chat(
  model='qwen3.5:4b',
  messages=[
    {
      "role": "user",
      "content": user_input 
    },
  ],
)
print(response.message.content) 