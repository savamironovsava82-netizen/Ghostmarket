export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).json({ ok: true });
  }

  try {
    const token = process.env.BOT_TOKEN;

    if (!token) {
      return res.status(500).json({
        ok: false,
        error: "BOT_TOKEN не найден"
      });
    }

    const update = req.body;

    if (update.message) {
      const chatId = update.message.chat.id;
      const text = update.message.text || "";

      if (text === "/start") {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            chat_id: chatId,
            text:
              "👻 <b>Добро пожаловать в GHOSTMARKET</b>\n\n" +
              "Фирменный магазин Ghostshop.\n" +
              "Нажми кнопку ниже, чтобы открыть каталог.",
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "🛒 Открыть GhostMarket",
                    web_app: {
                      url: "https://ghostmarket-theta.vercel.app"
                    }
                  }
                ]
              ]
            }
          })
        });
      }
    }

    return res.status(200).json({ ok: true });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      ok: false,
      error: error.message
    });
  }
}
