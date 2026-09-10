const REPO_OWNER = "savamironovsava82-netizen";
const REPO_NAME = "Ghostmarket";
const FILE_PATH = "data/products.json";

const ADMIN_ID = "1710854749";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    // =========================
    // ПОЛУЧЕНИЕ ТОВАРОВ
    // =========================

    if (req.method === "GET") {
      const products = await getProducts();

      return res.status(200).json({
        ok: true,
        products
      });
    }


    // =========================
    // СОХРАНЕНИЕ ТОВАРОВ
    // =========================

    if (req.method === "POST") {

      const { products, user } = req.body || {};

      if (!user || String(user.id) !== ADMIN_ID) {
        return res.status(403).json({
          ok: false,
          error: "Доступ запрещён"
        });
      }

      if (!Array.isArray(products)) {
        return res.status(400).json({
          ok: false,
          error: "Неверный список товаров"
        });
      }

      await saveProducts(products);

      return res.status(200).json({
        ok: true
      });
    }


    return res.status(405).json({
      ok: false,
      error: "Method not allowed"
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      ok: false,
      error: error.message
    });
  }
}


// =========================
// ПОЛУЧИТЬ ФАЙЛ ИЗ GITHUB
// =========================

async function getProducts() {

  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    throw new Error("GITHUB_TOKEN не найден");
  }

  const response = await fetch(
    `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json"
      }
    }
  );


  if (response.status === 404) {
    return [];
  }


  if (!response.ok) {
    throw new Error("Не удалось получить товары из GitHub");
  }


  const data = await response.json();

  const decoded =
    Buffer.from(data.content, "base64").toString("utf8");

  return JSON.parse(decoded);
}


// =========================
// СОХРАНИТЬ ФАЙЛ В GITHUB
// =========================

async function saveProducts(products) {

  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    throw new Error("GITHUB_TOKEN не найден");
  }


  let sha = null;


  // Проверяем существующий файл

  const existing =
    await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json"
        }
      }
    );


  if (existing.ok) {

    const data = await existing.json();

    sha = data.sha;

  }


  const content =
    Buffer
      .from(
        JSON.stringify(products, null, 2),
        "utf8"
      )
      .toString("base64");


  const body = {
    message: "Обновление товаров GhostMarket",
    content
  };


  if (sha) {
    body.sha = sha;
  }


  const response =
    await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`,
      {
        method: "PUT",

        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json"
        },

        body: JSON.stringify(body)
      }
    );


  if (!response.ok) {

    const error =
      await response.text();

    throw new Error(
      "GitHub: " + error
    );
  }
}
