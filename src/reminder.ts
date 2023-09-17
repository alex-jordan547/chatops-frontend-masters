import { type Handler, schedule} from "@netlify/functions";
import { getNewItems } from "./util/notion";
import { blocks, slackApi} from "./util/slack";

const postNewNotionItemsToSlack: Handler = async () => {
    const items = await getNewItems();

        await slackApi('chat.postMessage', {
            channel: process.env.SLACK_CHANNEL_ID,
            blocks: [
                blocks.section({
                    text: [
                        'Here are the opinions awaiting your judgement:',
                        '',
                        ...items.map(
                            (item) => `- ${item.opinion} (spice level: ${item.spiceLevel})`
                        ),
                        '',
                        `See all items: <https://www.notion.so/alex-jordan/${process.env.NOTION_DATABASE_ID}|in Notion>.`,
                    ].join('\n'),
                }),
            ],
        })

    return {
        statusCode: 200,
    }
}

export const handler = schedule('*/5 * * * *', postNewNotionItemsToSlack); // every 5 minutes