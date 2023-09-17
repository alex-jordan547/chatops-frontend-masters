
export async function notionApi(
    endpoint: string,
    body: {},
) {
    const response = await fetch(`https://api.notion.com/v1/${endpoint}`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
            'Content-Type': 'application/json',
            'Notion-Version': '2022-06-28',
        },
        body: JSON.stringify(body),
    }).catch((error) => console.error(error));
    if(!response || !response.ok) {
        console.error(response);
    }

    return await response?.json();
}

export async function getNewItems(): Promise<NewItem[]> {
    const notionData = await notionApi(`databases/${process.env.NOTION_DATABASE_ID}/query`, {

        filter: {
            property: 'status',
            status: {
                equals: 'new',
            },
        },
        page_size: 100,
    });

    return notionData.results.map((item: NotionItem) => {
        return {
            opinion: item.properties.opinion.title[0].text.content,
            spiceLevel: item.properties.spiceLevel.select.name,
            status: item.properties.status.status.name,
        };
    });
}

export async function saveItem(item: NewItem) {
    const res = await notionApi(`pages`, {
        parent: {
            database_id: process.env.NOTION_DATABASE_ID,
        },
        properties: {
            opinion: {
                title: [
                    {
                        text: {
                            content: item.opinion,
                        },
                    },
                ],
            },
            spiceLevel: {
                select: {
                    name: item.spiceLevel,
                },
            },
            submitter: {
                rich_text: [
                    {
                        text: {
                            content: `@${item.submitter} on Slack`,
                        }
                    }],
            },
        },
    });

    if(!res.ok) {
        console.error(res);
    }


}


