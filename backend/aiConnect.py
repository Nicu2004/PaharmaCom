from ollama import Client

client = Client(host='http://10.123.4.5:11434', headers={'x-some-header': 'some-value'})
response = client.chat(
  model='qwen3.5:4b',
  messages=[
    {
      'role': 'user',
      'content': 'Why is the sky blue?',
    },
  ],
)
print(response.message.content)