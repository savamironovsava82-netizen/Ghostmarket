export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed"
    });
  }

  try {
    const { items, total, user } = req.body;

    const token = process.env.BOT_TOKEN;
    const adminId = "1710854749";

    if (!token) {
      return res.status(500).json({
        ok: false,
        error: "BOT_TOKEN не найден"
      });
    }

    const itemText = items
      .map(item =>
        `• ${item.name} × ${item.qty} — ${item.price * item.qty} ₽`
      )
      .join("\n");

    const message =
      `🛒 <b>НОВЫЙ ЗАКАЗ — GHOSTMARKET</b>\n\n` +
      `👤 Клиент: ${user?.first_name || "Не указан"}\n` +
      `🆔 ID: <code>${user?.id || "Не указан"}</code>\n\n` +
      `📦 <b>Товары:</b>\n${itemText}\n\n` +
      `💰 <b>Итого: ${total} ₽</b>`;

    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          chat_id: adminId,
          text: message,
          parse_mode: "HTML"
        })
      }
    );

    const result = await telegramResponse.json();

    if (!result.ok) {
      return res.status(500).json({
        ok: false,
        error: result.description
      });
    }

    return res.status(200).json({
      ok: true
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      ok: false,
      error: error.message
    });
  }
}
