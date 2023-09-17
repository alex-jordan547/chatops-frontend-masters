import type { Handler } from '@netlify/functions';
import { parse } from "querystring";
import {slackApi, verifySlackRequest, modal, blocks, handlerInteractivity} from "./util/slack";
import {MODALS} from "./util/constants";

async function handleSlashCommand(payload: SlackSlashCommandPayload) {

	switch (payload.command) {
		case '/foodfight':
			const response = await slackApi('views.open',
				modal({
						  id: MODALS.foodFightModal,
						  title: 'Start a Food Fight',
						  trigger_id: payload.trigger_id,
						  blocks: [
							  blocks.section({
								  text:
								  'The discourse demands food drama! *Send in your spiciest food takes so we can all argue about them.*',
							  }),
							  blocks.input({
								  id: 'opinion',
								  label: 'Deposit your controversial food opinion here',
								  placeholder: 'e.g. peanut butter is the best condiment',
								  initial_value: payload.text ?? '',
							  hint: 'What do you believe about food that others might disagree with?',
							  }),
							  blocks.select({
								  id: 'spice_level',
								  label: 'How spicy is this opinion?',
								  placeholder: 'Select a spice level',
								  options: [
									  {label: 'Mild', value: 'mild'},
									  {label: 'Medium', value: 'medium'},
									  {label: 'Spicy', value: 'spicy'},
									  {label: 'Nuclear', value: 'nuclear'},
								  ],
							  })
						  ],
					  }),
				);

			if (!response.ok) {
				console.log(response);
			}
			break;
		default:
			return {
				statusCode: 200,
				body: `Command ${payload.command} is not recognized.`,
			}
	}

	return {
		statusCode: 200,
		body: '',
	}
}



export const handler: Handler = async (event) => {
	// TODO validate the Slack request
	const isValid = verifySlackRequest(event);

	if(!isValid) {
		console.error('Invalid request')
		return {
			statusCode: 400,
			body: 'Invalid request',
		}
	}

	// TODO handle slash commands
	const body = parse(event.body ?? '') as SlackPayload;
	if(body.command) {
		return handleSlashCommand(body as SlackSlashCommandPayload);
	}

	// TODO handle interactivity (e.g. context commands, modals)
	if (body.payload) {
		const payload = JSON.parse(body.payload) ;
		return handlerInteractivity(payload);
	}

	return {
		statusCode: 200,
		body: 'TODO: handle Slack commands and interactivity!!!!!!',
	};
};


