import type { HandlerEvent} from "@netlify/functions";

import { createHmac} from "crypto";
import {MODALS} from "./constants";
import {saveItem} from "./notion";

export function slackApi(
    endpoint: SlackApiEndpoint,
    body: SlackApiRequestBody
){

    return fetch(`https://slack.com/api/${endpoint}`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${process.env.SLACK_BOT_OAUTH_TOKEN}`,
            'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify(body),
    }).then((res) => res.json())
}

export function verifySlackRequest(request: HandlerEvent) {
    const secret = process.env.SLACK_SIGNING_SECRET; // signing secret from Slack
    const signature = request.headers['x-slack-signature']; // signature from Slack
    const timestamp = Number(request.headers['x-slack-request-timestamp']); // seconds since epoch
    const now = Math.floor(Date.now() / 1000); // seconds since epoch

    if(Math.abs(now - timestamp) > 300) {
        return false;
    }

    // @ts-ignore
    const hash = createHmac('sha256', secret)
        .update(`v0:${timestamp}:${request.body}`)
        .digest('hex');

    return `v0=${hash}` === signature;
}

export const blocks = {
    section: ({text} : SectionBlockArgs): SlackBlockSection => {
        return {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text,
            }
        }
    },
    input: ({ id, label, placeholder, initial_value = '', hint = ''} : InputBlockArgs) : SlackBlockInput => {
        return {
            block_id: `${id}_block`,
            type: 'input',
            label: {
                type: 'plain_text',
                text: label,
            },
            element: {
                action_id: id,
                type: 'plain_text_input',
                placeholder: {
                    type: 'plain_text',
                    text: placeholder,
                },
                initial_value,
            },
            hint: {
                type: 'plain_text',
                text: hint,
            }
        }
    },
    select: ({id, label, placeholder, options} : SelectBlockArgs): SlackBlockInput => {
        return {
            block_id: `${id}_block`,
            type: 'input',
            label: {
                text: label,
                type: 'plain_text',
            },
            element: {
                action_id: id,
                type: 'static_select',
                placeholder: {
                    text: placeholder,
                    type: 'plain_text',
                    emoji: true,
                },
                options : options.map(({label, value} : any) => {
                    return {
                        text: {
                            text: label,
                            type: 'plain_text',
                            emoji: true,
                        },
                        value,
                    }
                }),
            }
        }

    }
}

export function modal({
                          trigger_id,
                          id,
                          title,
                          submit_text = 'Submit',
                          blocks,}: ModalArgs) {
    return {
        trigger_id,
        view: {
            type: 'modal',
            callback_id: id,
            title: {
                type: 'plain_text',
                text: title,
            },
            submit: {
                type: 'plain_text',
                text: submit_text,
            },
            blocks,
        }
    }
}

export async function handlerInteractivity(payload: SlackModalPayload) {
    const callback_id = payload.callback_id ?? payload.view.callback_id;

    switch (callback_id) {
        case MODALS.foodFightModal:
            const data = payload.view.state.values;
            const fields = {
                opinion: data.opinion_block.opinion.value,
                spiceLevel: data.spice_level_block.spice_level.selected_option.value,
                submitter: payload.user.name,
            }
            await saveItem(fields);

            await slackApi('chat.postMessage', {
                channel: process.env.SLACK_CHANNEL_ID,
                text: `Oh dang, y'all! :eyes: <@${payload.user.id}> just started a food fight with a  ${fields.spiceLevel} take: \n\n*${fields.opinion}*\n\n...discuss`,
            })
            break;

            case MODALS.startFoodFightNudge:
                const channel = payload.channel?.id;
                const user_id = payload.user.id;
                const thread_ts = payload.message.ts ?? payload.message.ts;
                await slackApi('chat.postMessage', {
                    channel,
                    thread_ts,
                    text: `Hey <@${user_id}>, an opinion like this one deserves a heated public debate. Run the \`/foodfight\` command in a main channel to start one!`,
                })
                break;
        default:
            console.log('Unknown callback_id', callback_id);
            return {
                statusCode: 400,
                body: `Unknown callback_id ${callback_id}`,
            }
    }
    return {
        statusCode: 200,
        body: '',
    }
}