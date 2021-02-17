import click
from collections import defaultdict
import requests 
import json
from typing import Type


Url = Type[str]


URL = "http://localhost:5000"
TOKEN: str = None
CHANNEL: str = None
GUILD: str = None
AVATAR: Url = None
ID: str = None

USERNAME: str = 'Dude playing a dude'
USER_ID: str = None
USER_AVATAR: str = None

MESSAGE = ''
JSON = None

DISCORD_URL = 'https://discordapp.com/api/webhooks/709102441731194941/06EcgcgVnAWxmmU0jUTTPhM69GKgl1oE6JBLpAwNwtgZU-mTlfP81HWI4jTs5n2uN_aF'
PAYLOAD = {
	"type": 1,
	"id": "709102441731194941",
	"name": "Captain Hook",
	"avatar": None,
	# "channel_id": "538561802112335885",
	# "guild_id": "538561802112335883",
	"token": "06EcgcgVnAWxmmU0jUTTPhM69GKgl1oE6JBLpAwNwtgZU-mTlfP81HWI4jTs5n2uN_aF",
	"user": {
		"username": "test",
		"discriminator": "7479",
		"id": "190320984123768832",
		"avatar": "b004ec1740a63ca06ae2e14c5cee11f3"
	},
	"content": "hello?"
}

# @click.command()
# @click.option('-m', '--message', 'msg')
def set_message(msg):
	if msg is None:
		msg = 'This is the default message'
	assert type(msg) == str
	global MESSAGE
	MESSAGE = msg

def get_json(url):
	if url:
		r = requests.get(url)
		r_json = r.json()
		print(json.dumps(r_json, indent=2))
		return r_json
	else:
		return dict()

def format_status_code(status: int):
	"returns a colored string of the http status code"
	if not status // 200:
		return click.style(str(status), fg='white')
	elif not status // 300:
		return click.style(str(status), fg='green')
	elif not status // 400:
		return click.style(str(status), fg='yellow')
	else:
		return click.style(str(status), fg='red')

def send_messages():
	print('press <enter> to send message, <ctrl-C> to quit')
	status = ''
	while True:
		msg = input(f'(send.py)[{status:>3}]>')
		msg = msg.replace('\\n', '\n')
		payload = {'message': msg}
		r = requests.post(url=URL, json=json.dumps(payload))
		r_json = r.json()
		success = 'SUCCESS' if r_json.get('success') else 'FAILURE'
		message = r_json.get('message', '')
		status = format_status_code(r.status_code)
		

def discord_default():
	print('press <enter> to send message, <ctrl-C> to quit')
	status = ''
	name = click.style(PAYLOAD['name'], fg='cyan')
	script_name = click.style('send.py', fg='bright_yellow')
	while True:
		msg = input(f'{script_name}[{status:>3}]{name}>')
		msg = msg.replace('\\n', '\n')
		PAYLOAD['content'] = msg
		resp = requests.post(url=DISCORD_URL, json=PAYLOAD)
		status = format_status_code(resp.status_code)
		
		if DEBUG:
			headers = dict(resp.headers)
			resp_json = resp.text
			print('HEADERS:')
			print(json.dumps(headers, indent=2))
			print('JSON PAYLOAD:')
			print(json.dumps(resp_json, indent=2))
		

@click.command()
@click.option(
	'-m',
	'--message',
	'msg',
	help='message to send to webhook',
)
@click.option(
	'-w',
	'--webhook-url',
	'json_url',
	help='gets the json from the discord webhook url',
)
@click.option(
	'-r',
	'--repeat',
	help='send message n times',
	default=1,
	type=click.IntRange(0, None),
)
@click.option(
	'--default',
	help='use the hardcoded default payload json',
	is_flag=True,
)
@click.option(
	'-d',
	'--debug',
	help='turn on debugging info',
	is_flag=True,
)
def main(
	msg,
	repeat,
	json_url,
	default,
	debug,
):
	global DEBUG
	DEBUG = debug
	payload = get_json(json_url)
	if default:
		discord_default()
	elif msg:
		payload['message'] = msg
	else:
		send_messages()

if __name__ == '__main__':
	main()
