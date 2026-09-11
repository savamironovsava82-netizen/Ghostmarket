const tg = window.Telegram?.WebApp;

if (tg) {
  tg.ready();
  tg.expand();
}

// ===============================
// ТОВАРЫ
// ===============================

let products = [];

async function loadProducts() {
  try {
    const response = await fetch("/api/products");

    if (!response.ok) {
      throw new Error("Не удалось загрузить товары");
    }

    const data = await response.json();

    if (!data.ok || !Array.isArray(data.products)) {
      throw new Error("Неверный формат товаров");
    }

    products = data.products;

    console.log("Товары загружены:", products);

    renderCategories();
    renderProducts();

    createAdminButton();

  } catch (error) {
    console.error("Ошибка загрузки товаров:", error);

    const productsContainer = document.getElementById("products");

    if (productsContainer) {
      productsContainer.innerHTML = `
        <div class="empty">
          <div class="empty-icon">👻</div>
          <h2>Каталог временно недоступен</h2>
          <p>Попробуйте обновить приложение.</p>
        </div>
      `;
    }
  }
}

// ===============================
// СОСТОЯНИЕ
// ===============================

let category = "Все";
let cart = [];
let selectedProduct = null;

// ===============================
// ЭЛЕМЕНТЫ
// ===============================

const categoriesEl = document.querySelector("#categories");
const productsEl = document.querySelector("#products");
const searchEl = document.querySelector("#search");

const cartButton = document.querySelector("#cartButton");
const cartTotal = document.querySelector("#cartTotal");
const sheetTotal = document.querySelector("#sheetTotal");
const cartItems = document.querySelector("#cartItems");

const sheet = document.querySelector("#cartSheet");
const backdrop = document.querySelector("#backdrop");

// ===============================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ===============================

function money(n) {
  return new Intl.NumberFormat("ru-RU").format(n) + " ₽";
}

// ===============================
// КАТЕГОРИИ
// ===============================

function renderCategories() {
  if (!categoriesEl) return;

  const cats = [
    "Все",
    ...new Set(products.map(p => p.category))
  ];

  categoriesEl.innerHTML = cats
    .map(c => `
      <button
        class="category ${c === category ? "active" : ""}"
        data-category="${c}"
      >
        ${c}
      </button>
    `)
    .join("");

  categoriesEl
    .querySelectorAll(".category")
    .forEach(button => {
      button.onclick = () => {
        category = button.dataset.category;

        renderCategories();
        renderProducts();
      };
    });
}

// ===============================
// КАТАЛОГ
// ===============================

function renderProducts() {
  if (!productsEl || !searchEl) return;

  const q = searchEl.value
    .trim()
    .toLowerCase();

  const list = products.filter(product => {
    const categoryMatch =
      category === "Все" ||
      product.category === category;

    const searchMatch =
      product.name.toLowerCase().includes(q);

    return categoryMatch && searchMatch;
  });

  productsEl.innerHTML = list
    .map(product => {
      const prices = Array.isArray(product.flavors)
        ? product.flavors.map(f => Number(f.price) || 0)
        : [0];

      const minPrice = Math.min(...prices);

      return `
        <article class="product">

          <img
            class="product-img"
            src="${product.image || "logo.jpg"}"
            alt="${product.name}"
          >

          <div class="product-body">

            <div class="product-name">
              ${product.name}
            </div>

            <div class="product-meta">
              ${product.category}
            </div>

            <div class="product-bottom">

              <span class="price">
                от ${money(minPrice)}
              </span>

              <button
                class="add"
                data-id="${product.id}"
              >
                Выбрать
              </button>

            </div>

          </div>

        </article>
      `;
    })
    .join("");

  productsEl
    .querySelectorAll(".add")
    .forEach(button => {
      button.onclick = () => {
        const productId =
          Number(button.dataset.id);

        openFlavorSelector(productId);
      };
    });

  if (!list.length) {
    productsEl.innerHTML = `
      <div
        class="empty"
        style="grid-column:1/-1"
      >
        <h2>Ничего не найдено</h2>
      </div>
    `;
  }
}

// ===============================
// ОКНО ВЫБОРА ВКУСА
// ===============================

function openFlavorSelector(productId) {
  selectedProduct =
    products.find(p => p.id === productId);

  if (!selectedProduct) return;

  let modal =
    document.querySelector("#flavorModal");

  if (!modal) {
    modal = document.createElement("div");

    modal.id = "flavorModal";

    modal.innerHTML = `
      <div class="flavor-overlay">

        <div class="flavor-window">

          <button
            id="closeFlavor"
            class="flavor-close"
          >
            ×
          </button>

          <img
            id="flavorImage"
            class="flavor-image"
            src=""
            alt=""
          >

          <h2 id="flavorTitle"></h2>

          <p class="flavor-subtitle">
            Выберите вкус
          </p>

          <div id="flavorsList"></div>

        </div>

      </div>
    `;

    document.body.appendChild(modal);

    document.querySelector("#closeFlavor").onclick =
      closeFlavorSelector;

    modal
      .querySelector(".flavor-overlay")
      .onclick = event => {
        if (
          event.target.classList.contains(
            "flavor-overlay"
          )
        ) {
          closeFlavorSelector();
        }
      };
  }

  document.querySelector("#flavorImage").src =
    selectedProduct.image || "logo.jpg";

  document.querySelector("#flavorTitle").textContent =
    selectedProduct.name;

  const flavorsList =
    document.querySelector("#flavorsList");

  flavorsList.innerHTML =
    selectedProduct.flavors
      .map((flavor, index) => `
        <button
          class="flavor-item"
          data-flavor="${index}"
        >
          <span>
            ${flavor.name}
          </span>

          <strong>
            ${money(flavor.price)}
          </strong>
        </button>
      `)
      .join("");

  flavorsList
    .querySelectorAll(".flavor-item")
    .forEach(button => {
      button.onclick = () => {
        const index =
          Number(button.dataset.flavor);

        addFlavorToCart(
          selectedProduct,
          selectedProduct.flavors[index]
        );
      };
    });

  modal.classList.add("open");
}

function closeFlavorSelector() {
  const modal =
    document.querySelector("#flavorModal");

  if (modal) {
    modal.classList.remove("open");
  }
}

// ===============================
// ДОБАВЛЕНИЕ В КОРЗИНУ
// ===============================

function addFlavorToCart(product, flavor) {
  const existing =
    cart.find(item =>
      item.productId === product.id &&
      item.flavorName === flavor.name
    );

  if (existing) {
    existing.qty++;
  } else {
    cart.push({
      productId: product.id,
      productName: product.name,
      flavorName: flavor.name,
      price: Number(flavor.price),
      qty: 1
    });
  }

  renderCart();
  closeFlavorSelector();
  openCart();
}

// ===============================
// КОЛИЧЕСТВО
// ===============================

function changeQty(productId, flavorName, delta) {
  const item =
    cart.find(x =>
      x.productId === productId &&
      x.flavorName === flavorName
    );

  if (!item) return;

  item.qty += delta;

  if (item.qty <= 0) {
    cart = cart.filter(x =>
      !(
        x.productId === productId &&
        x.flavorName === flavorName
      )
    );
  }

  renderCart();
}

// ===============================
// КОРЗИНА
// ===============================

function renderCart() {
  if (!cartButton || !cartTotal || !sheetTotal || !cartItems) {
    return;
  }

  const total =
    cart.reduce(
      (sum, item) =>
        sum + item.price * item.qty,
      0
    );

  cartTotal.textContent =
    money(total);

  sheetTotal.textContent =
    money(total);

  cartButton.classList.toggle(
    "hidden",
    cart.length === 0
  );

  if (!cart.length) {
    cartItems.innerHTML = `
      <div class="empty">
        <h2>Корзина пуста</h2>
      </div>
    `;

    return;
  }

  cartItems.innerHTML =
    cart.map(item => `
      <div class="cart-row">

        <div class="cart-info">

          <b>
            ${item.productName}
          </b>

          <div class="product-meta">
            ${item.flavorName}
          </div>

          <div class="product-meta">
            ${money(item.price)} × ${item.qty}
          </div>

        </div>

        <div class="qty">

          <button
            onclick='changeQty(
              ${item.productId},
              ${JSON.stringify(item.flavorName)},
              -1
            )'
          >
            −
          </button>

          <b>
            ${item.qty}
          </b>

          <button
            onclick='changeQty(
              ${item.productId},
              ${JSON.stringify(item.flavorName)},
              1
            )'
          >
            +
          </button>

        </div>

      </div>
    `)
    .join("");
}

// ===============================
// ОТКРЫТИЕ КОРЗИНЫ
// ===============================

function openCart() {
  if (!sheet || !backdrop) return;

  sheet.classList.add("open");
  backdrop.classList.add("open");
}

function closeCart() {
  if (!sheet || !backdrop) return;

  sheet.classList.remove("open");
  backdrop.classList.remove("open");
}

if (cartButton) {
  cartButton.onclick = openCart;
}

const closeCartButton =
  document.querySelector("#closeCart");

if (closeCartButton) {
  closeCartButton.onclick = closeCart;
}

if (backdrop) {
  backdrop.onclick = closeCart;
}

// ===============================
// ПОИСК
// ===============================

if (searchEl) {
  searchEl.oninput = renderProducts;
}

// ===============================
// ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК
// ===============================

document
  .querySelectorAll(".tab")
  .forEach(tab => {
    tab.onclick = () => {

      document
        .querySelectorAll(".tab")
        .forEach(x =>
          x.classList.remove("active")
        );

      document
        .querySelectorAll(".screen")
        .forEach(x =>
          x.classList.remove("active")
        );

      tab.classList.add("active");

      const target =
        document.querySelector(
          "#" + tab.dataset.tab
        );

      if (target) {
        target.classList.add("active");
      }
    };
  });

// ===============================
// ОФОРМЛЕНИЕ ЗАКАЗА
// ===============================

const checkoutButton =
  document.querySelector("#checkoutButton");

if (checkoutButton) {
  checkoutButton.onclick = async () => {

    if (!cart.length) return;

    const total =
      cart.reduce(
        (sum, item) =>
          sum + item.price * item.qty,
        0
      );

    const items =
      cart.map(item => ({
        name:
          `${item.productName} — ${item.flavorName}`,
        price:
          item.price,
        qty:
          item.qty
      }));

    const user =
      tg?.initDataUnsafe?.user || null;

    try {

      const response =
        await fetch(
          "/api/order",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({
              items,
              total,
              user
            })
          }
        );

      const result =
        await response.json();

      if (!result.ok) {
        throw new Error(
          result.error ||
          "Ошибка отправки"
        );
      }

      cart = [];

      renderCart();
      closeCart();

      if (tg?.showPopup) {
        tg.showPopup({
          title:
            "Заказ принят 👻",

          message:
            "Заказ успешно отправлен.",

          buttons: [
            {
              type: "ok"
            }
          ]
        });
      } else {
        alert(
          "Заказ успешно отправлен!"
        );
      }

    } catch (error) {

      console.error(error);

      if (tg?.showPopup) {
        tg.showPopup({
          title:
            "Ошибка",

          message:
            "Не удалось отправить заказ. Попробуйте ещё раз.",

          buttons: [
            {
              type: "ok"
            }
          ]
        });
      } else {
        alert(
          "Не удалось отправить заказ."
        );
      }
    }
  };
}

// ===============================
// АДМИН-ПАНЕЛЬ
// ===============================

const ADMIN_ID = "1710854749";

function isAdmin() {
  return String(
    tg?.initDataUnsafe?.user?.id || ""
  ) === ADMIN_ID;
}

function createAdminButton() {

  if (!isAdmin()) return;

  if (document.querySelector(".admin-button")) {
    return;
  }

  const button =
    document.createElement("button");

  button.textContent =
    "⚙️ Админка";

  button.className =
    "admin-button";

  button.style.cssText = `
    width: calc(100% - 32px);
    margin: 16px;
    padding: 14px;
    border: 0;
    border-radius: 14px;
    background: #111;
    color: white;
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
  `;

  button.onclick =
    openAdminPanel;

  const app =
    document.querySelector(".app");

  if (app) {
    app.prepend(button);
  }
}

// ===============================
// АДМИНКА
// ===============================

function openAdminPanel() {

  let panel =
    document.querySelector("#adminPanel");

  if (!panel) {

    panel =
      document.createElement("div");

    panel.id =
      "adminPanel";

    panel.innerHTML = `
      <div style="
        position:fixed;
        inset:0;
        background:rgba(0,0,0,.7);
        z-index:9999;
        padding:20px;
        overflow:auto;
      ">

        <div style="
          max-width:520px;
          margin:20px auto;
          background:white;
          border-radius:22px;
          padding:20px;
        ">

          <div style="
            display:flex;
            justify-content:space-between;
            align-items:center;
            margin-bottom:20px;
          ">

            <h2 style="margin:0">
              ⚙️ Админка
            </h2>

            <button
              id="closeAdmin"
              style="
                border:0;
                background:#eee;
                border-radius:10px;
                width:40px;
                height:40px;
                font-size:24px;
              "
            >
              ×
            </button>

          </div>

          <button
            id="addProductAdmin"
            style="
              width:100%;
              padding:14px;
              margin-bottom:10px;
              border:0;
              border-radius:14px;
              background:#111;
              color:white;
              font-weight:700;
              font-size:15px;
            "
          >
            ➕ Добавить товар
          </button>

          <div id="adminProducts"></div>

        </div>

      </div>
    `;

    document.body.appendChild(panel);

    document.querySelector("#closeAdmin").onclick =
      () => {
        panel.remove();
      };

    document.querySelector("#addProductAdmin").onclick =
      addProductAdmin;
  }

  renderAdminProducts();
}

// ===============================
// СПИСОК ТОВАРОВ В АДМИНКЕ
// ===============================

function renderAdminProducts() {

  const container =
    document.querySelector("#adminProducts");

  if (!container) return;

  container.innerHTML =
    products.map(product => `
      <div style="
        border:1px solid #ddd;
        border-radius:16px;
        padding:14px;
        margin-bottom:12px;
      ">

        <div style="
          font-weight:700;
          font-size:17px;
          margin-bottom:5px;
        ">
          ${product.name}
        </div>

        <div style="
          color:#777;
          margin-bottom:10px;
        ">
          ${product.category}
        </div>

        <div style="
          margin-bottom:12px;
        ">
          ${product.flavors
            .map(f =>
              `${f.name} — ${money(f.price)}`
            )
            .join("<br>")}
        </div>

        <button
          onclick="editProductAdmin(${product.id})"
          style="
            padding:10px 12px;
            border:0;
            border-radius:10px;
            margin-right:5px;
          "
        >
          ✏️ Изменить
        </button>

        <button
          onclick="deleteProductAdmin(${product.id})"
          style="
            padding:10px 12px;
            border:0;
            border-radius:10px;
            background:#eee;
          "
        >
          🗑️ Удалить
        </button>

      </div>
    `)
    .join("");
}

// ===============================
// СОХРАНЕНИЕ ТОВАРОВ
// ===============================

async function saveProductsAdmin() {

  try {

    const user =
      tg?.initDataUnsafe?.user || null;

    if (
      !user ||
      String(user.id) !== ADMIN_ID
    ) {
      alert("Доступ запрещён");
      return;
    }

    const response =
      await fetch(
        "/api/products",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            products,
            user
          })
        }
      );

    const result =
      await response.json();

    if (!result.ok) {
      throw new Error(
        result.error ||
        "Ошибка сохранения"
      );
    }

    alert(
      "✅ Товары сохранены"
    );

    renderCategories();
    renderProducts();
    renderAdminProducts();

  } catch (error) {

    console.error(error);

    alert(
      "❌ Ошибка сохранения: " +
      error.message
    );
  }
}

// ===============================
// ДОБАВИТЬ ТОВАР
// ===============================

function addProductAdmin() {

  const name =
    prompt("Название товара:");

  if (!name) return;

  const category =
    prompt(
      "Категория:",
      "Жидкости"
    );

  if (!category) return;

  const image =
    prompt(
      "Файл фотографии:",
      "logo.jpg"
    );

  if (!image) return;

  const flavorName =
    prompt(
      "Название варианта:",
      "Вариант 1"
    );

  if (!flavorName) return;

  const price =
    Number(
      prompt(
        "Цена:",
        "500"
      )
    );

  if (!price) return;

  const newProduct = {
    id: Date.now(),

    name,

    category,

    image,

    flavors: [
      {
        name: flavorName,
        price
      }
    ]
  };

  products.push(newProduct);

  saveProductsAdmin();
}

// ===============================
// ИЗМЕНИТЬ ТОВАР
// ===============================

function editProductAdmin(productId) {

  const product =
    products.find(
      p => p.id === productId
    );

  if (!product) return;

  const name =
    prompt(
      "Название товара:",
      product.name
    );

  if (!name) return;

  const category =
    prompt(
      "Категория:",
      product.category
    );

  if (!category) return;

  const image =
    prompt(
      "Файл фотографии:",
      product.image
    );

  if (!image) return;

  product.name =
    name;

  product.category =
    category;

  product.image =
    image;

  product.flavors.forEach(flavor => {

    const newPrice =
      prompt(
        `Цена для "${flavor.name}":`,
        flavor.price
      );

    if (
      newPrice !== null &&
      !isNaN(Number(newPrice))
    ) {
      flavor.price =
        Number(newPrice);
    }
  });

  saveProductsAdmin();
}

// ===============================
// УДАЛИТЬ ТОВАР
// ===============================

function deleteProductAdmin(productId) {

  const product =
    products.find(
      p => p.id === productId
    );

  if (!product) return;

  const confirmed =
    confirm(
      `Удалить "${product.name}"?`
    );

  if (!confirmed) return;

  products =
    products.filter(
      p => p.id !== productId
    );

  saveProductsAdmin();
}

// ===============================
// ЗАПУСК
// ===============================

renderCart();
loadProducts();
