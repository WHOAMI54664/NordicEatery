export async function sendTelegramMessage(message: string) {
    const token = process.env.TELEGRAM_BOT_TOKEN;

    const chatIdsRaw =
        process.env.TELEGRAM_CHAT_IDS ||
        process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatIdsRaw) {
        throw new Error("Missing Telegram env variables");
    }

    const chatIds = chatIdsRaw
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);

    if (chatIds.length === 0) {
        throw new Error("Missing Telegram chat ids");
    }

    await Promise.all(
        chatIds.map(async (chatId) => {
            const response = await fetch(
                `https://api.telegram.org/bot${token}/sendMessage`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: message,
                        parse_mode: "HTML",
                    }),
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Telegram send error:", errorText);
                throw new Error("Failed to send Telegram message");
            }
        })
    );
}