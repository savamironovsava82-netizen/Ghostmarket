```javascript
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

    renderCategories();
    renderProducts();

    if (document.querySelector("#adminPanel")) {
      renderAdminProducts();
    }

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
// ВСПОМОГАТЕЛЬНЫЕ
// ===============================

function money(n) {
  return new Intl.NumberFormat("ru-RU").format(Number(n) || 0) + " ₽";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ===============================
// КАТЕГОРИИ
// ===============================

function renderCategories() {
  const cats = [
    "Все",
    ...new Set(products.map(p => p.category).filter(Boolean))
  ];

  categoriesEl.innerHTML = cats
    .map(c => `
      <button
        class="category ${c === category ? "active" : ""}"
        data-category="${escapeHtml(c)}"
      >
        ${escapeHtml(c)}
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
  const q = searchEl.value.trim().toLowerCase();

  const list = products.filter(product => {
    const categoryMatch =
      category === "Все" ||
      product.category === category;

    const searchMatch =
      String(product.name || "")
        .toLowerCase()
        .includes(q);

    return categoryMatch && searchMatch;
  });

  productsEl.innerHTML = list
    .map(product => {
      const flavors = Array.isArray(product.flavors)
        ? product.flavors
        : [];

      const prices = flavors
        .map(f => Number(f.price))
        .filter(n => !isNaN(n));

      const minPrice = prices.length
        ? Math.min(...prices)
        : 0;

      return `
        <article class="product">

          <img
            class="product-img"
            src="${escapeHtml(product.image || "logo.jpg")}"
            alt="${escapeHtml(product.name)}"
          >

          <div class="product-body">

            <div class="product-name">
              ${escapeHtml(product.name)}
            </div>

            <div class="product-meta">
              ${escapeHtml(product.category || "")}
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
        openFlavorSelector(Number(button.dataset.id));
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
// ВЫБОР ВАРИАНТА
// ===============================

function openFlavorSelector(productId) {
  selectedProduct = products.find(
    p => Number(p.id) === Number(productId)
  );

  if (!selectedProduct) return;

  let modal = document.querySelector("#flavorModal");

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
            Выберите вариант
          </p>

          <div id="flavorsList"></div>

        </div>

      </div>
    `;

    document.body.appendChild(modal);

    document.querySelector("#closeFlavor").onclick =
      closeFlavorSelector;

    modal.querySelector(".flavor-overlay").onclick = event => {
      if (
        event.target.classList.contains("flavor-overlay")
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

  const flavors = Array.isArray(selectedProduct.flavors)
    ? selectedProduct.flavors
    : [];

  flavorsList.innerHTML = flavors
    .map((flavor, index) => `
      <button
        class="flavor-item"
        data-flavor="${index}"
      >
        <span>
          ${escapeHtml(flavor.name)}
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
        const index = Number(button.dataset.flavor);

        addFlavorToCart(
          selectedProduct,
          flavors[index]
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
// КОРЗИНА
// ===============================

function addFlavorToCart(product, flavor) {
  if (!flavor) return;

  const existing = cart.find(item =>
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

function changeQty(productId, flavorName, delta) {
  const item = cart.find(x =>
    Number(x.productId) === Number(productId) &&
    x.flavorName === flavorName
  );

  if (!item) return;

  item.qty += delta;

  if (item.qty <= 0) {
    cart = cart.filter(x =>
      !(
        Number(x.productId) === Number(productId) &&
        x.flavorName === flavorName
      )
    );
  }

  renderCart();
}

function renderCart() {
  const total = cart.reduce(
    (sum, item) =>
      sum + item.price * item.qty,
    0
  );

  cartTotal.textContent = money(total);
  sheetTotal.textContent = money(total);

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

  cartItems.innerHTML = cart
    .map(item => `
      <div class="cart-row">

        <div class="cart-info">

          <b>
            ${escapeHtml(item.productName)}
          </b>

          <div class="product-meta">
            ${escapeHtml(item.flavorName)}
          </div>

          <div class="product-meta">
            ${money(item.price)} × ${item.qty}
          </div>

        </div>

        <div class="qty">

          <button
            class="qty-minus"
            data-product="${item.productId}"
            data-flavor="${escapeHtml(item.flavorName)}"
          >
            −
          </button>

          <b>${item.qty}</b>

          <button
            class="qty-plus"
            data-product="${item.productId}"
            data-flavor="${escapeHtml(item.flavorName)}"
          >
            +
          </button>

        </div>

      </div>
    `)
    .join("");

  cartItems.querySelectorAll(".qty-minus").forEach(button => {
    button.onclick = () => {
      changeQty(
        Number(button.dataset.product),
        button.dataset.flavor,
        -1
      );
    };
  });

  cartItems.querySelectorAll(".qty-plus").forEach(button => {
    button.onclick = () => {
      changeQty(
        Number(button.dataset.product),
        button.dataset.flavor,
        1
      );
    };
  });
}

// ===============================
// КОРЗИНА — ОКНО
// ===============================

function openCart() {
  sheet.classList.add("open");
  backdrop.classList.add("open");
}

function closeCart() {
  sheet.classList.remove("open");
  backdrop.classList.remove("open");
}

cartButton.onclick = openCart;

document.querySelector("#closeCart").onclick =
  closeCart;

backdrop.onclick = closeCart;

// ===============================
// ПОИСК
// ===============================

searchEl.oninput = renderProducts;

// ===============================
// ВКЛАДКИ
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

      document
        .querySelector(
          "#" + tab.dataset.tab
        )
        .classList.add("active");
    };
  });

// ===============================
// ЗАКАЗ
// ===============================

document
  .querySelector("#checkoutButton")
  .onclick = async () => {

    if (!cart.length) return;

    const total = cart.reduce(
      (sum, item) =>
        sum + item.price * item.qty,
      0
    );

    const items = cart.map(item => ({
      name:
        `${item.productName} — ${item.flavorName}`,
      price: item.price,
      qty: item.qty
    }));

    const user =
      tg?.initDataUnsafe?.user || null;

    try {
      const response = await fetch(
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
          title: "Заказ принят 👻",

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
          title: "Ошибка",

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

// =====================================================
// АДМИН-ПАНЕЛЬ GHOSTMARKET
// =====================================================

const ADMIN_ID = "1710854749";

function isAdmin() {
  return String(
    tg?.initDataUnsafe?.user?.id || ""
  ) === ADMIN_ID;
}

// ===============================
// КНОПКА АДМИНКИ
// ===============================

function createAdminButton() {
  if (!isAdmin()) return;

  if (
    document.querySelector(".admin-button")
  ) {
    return;
  }

  const button =
    document.createElement("button");

  button.textContent =
    "⚙️ Управление каталогом";

  button.className =
    "admin-button";

  button.style.cssText = `
    width: calc(100% - 32px);
    margin: 16px;
    padding: 15px;
    border: 0;
    border-radius: 16px;
    background: #111;
    color: #fff;
    font-size: 15px;
    font-weight: 800;
    cursor: pointer;
    box-shadow: 0 8px 24px rgba(0,0,0,.15);
  `;

  button.onclick = openAdminPanel;

  document
    .querySelector(".app")
    .prepend(button);
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

    panel.id = "adminPanel";

    panel.innerHTML = `
      <div
        class="ghost-admin-overlay"
        id="adminOverlay"
      >

        <div class="ghost-admin">

          <div class="ghost-admin-header">

            <div>
              <div class="ghost-admin-label">
                GHOSTSHOP
              </div>

              <h2>
                ⚙️ Каталог
              </h2>

              <p>
                Управление товарами
              </p>
            </div>

            <button
              id="closeAdmin"
              class="ghost-close"
            >
              ×
            </button>

          </div>

          <div class="admin-actions">

            <button
              id="addProductAdmin"
              class="ghost-primary"
            >
              ➕ Добавить товар
            </button>

            <button
              id="saveProductsAdmin"
              class="ghost-save"
            >
              💾 Сохранить изменения
            </button>

          </div>

          <div
            id="adminProducts"
            class="admin-products"
          ></div>

        </div>

      </div>

      <style>

        #adminPanel {
          position: fixed;
          inset: 0;
          z-index: 99999;
        }

        .ghost-admin-overlay {
          position: absolute;
          inset: 0;
          background: rgba(0,0,0,.72);
          backdrop-filter: blur(10px);
          overflow-y: auto;
          padding: 20px 14px;
          box-sizing: border-box;
        }

        .ghost-admin {
          width: 100%;
          max-width: 650px;
          margin: 0 auto;
          background: #f7f7f7;
          color: #111;
          border-radius: 24px;
          overflow: hidden;
          box-shadow: 0 25px 80px rgba(0,0,0,.4);
        }

        .ghost-admin-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 22px;
          background: #111;
          color: white;
        }

        .ghost-admin-label {
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 2px;
          opacity: .55;
          margin-bottom: 5px;
        }

        .ghost-admin-header h2 {
          margin: 0;
          font-size: 25px;
        }

        .ghost-admin-header p {
          margin: 5px 0 0;
          opacity: .6;
          font-size: 13px;
        }

        .ghost-close {
          width: 38px;
          height: 38px;
          border: 0;
          border-radius: 12px;
          background: rgba(255,255,255,.12);
          color: white;
          font-size: 27px;
          cursor: pointer;
        }

        .admin-actions {
          display: grid;
          gap: 10px;
          padding: 16px;
          background: #fff;
        }

        .ghost-primary,
        .ghost-save {
          width: 100%;
          border: 0;
          border-radius: 15px;
          padding: 15px;
          font-size: 15px;
          font-weight: 800;
          cursor: pointer;
        }

        .ghost-primary {
          background: #111;
          color: #fff;
        }

        .ghost-save {
          background: #e8e8e8;
          color: #111;
        }

        .admin-products {
          padding: 0 16px 20px;
        }

        .admin-card {
          background: #fff;
          border-radius: 18px;
          padding: 15px;
          margin-top: 12px;
          border: 1px solid #e6e6e6;
        }

        .admin-card-top {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .admin-card-image {
          width: 62px;
          height: 62px;
          object-fit: cover;
          border-radius: 13px;
          background: #eee;
          flex-shrink: 0;
        }

        .admin-card-info {
          flex: 1;
          min-width: 0;
        }

        .admin-card-name {
          font-weight: 900;
          font-size: 16px;
          word-break: break-word;
        }

        .admin-card-category {
          color: #777;
          font-size: 12px;
          margin-top: 4px;
        }

        .admin-card-buttons {
          display: flex;
          gap: 7px;
          margin-top: 13px;
        }

        .admin-card-buttons button {
          flex: 1;
          border: 0;
          border-radius: 11px;
          padding: 11px 8px;
          font-weight: 800;
          cursor: pointer;
        }

        .admin-edit {
          background: #eee;
        }

        .admin-delete {
          background: #111;
          color: white;
        }

        .admin-flavors {
          margin-top: 12px;
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .admin-flavor {
          background: #f1f1f1;
          padding: 7px 9px;
          border-radius: 9px;
          font-size: 11px;
        }

        .admin-form {
          padding: 18px;
          background: #fff;
          border-radius: 18px;
          margin-top: 12px;
        }

        .admin-form h3 {
          margin: 0 0 15px;
          font-size: 19px;
        }

        .admin-field {
          margin-bottom: 13px;
        }

        .admin-field label {
          display: block;
          font-size: 12px;
          font-weight: 800;
          margin-bottom: 6px;
          color: #555;
        }

        .admin-field input,
        .admin-field select {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #ddd;
          border-radius: 12px;
          padding: 13px;
          font-size: 14px;
          background: #fafafa;
          outline: none;
        }

        .admin-field input:focus,
        .admin-field select:focus {
          border-color: #111;
          background: white;
        }

        .flavor-admin-row {
          display: grid;
          grid-template-columns: 1fr 110px 42px;
          gap: 7px;
          margin-bottom: 8px;
        }

        .flavor-admin-row input {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #ddd;
          border-radius: 10px;
          padding: 11px;
          font-size: 13px;
        }

        .remove-flavor {
          border: 0;
          border-radius: 10px;
          background: #eee;
          cursor: pointer;
          font-size: 18px;
        }

        .add-flavor {
          width: 100%;
          border: 1px dashed #bbb;
          background: white;
          border-radius: 11px;
          padding: 11px;
          font-weight: 800;
          cursor: pointer;
          margin-top: 3px;
        }

        .admin-form-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-top: 16px;
        }

        .admin-form-actions button {
          border: 0;
          border-radius: 12px;
          padding: 13px;
          font-weight: 800;
          cursor: pointer;
        }

        .admin-cancel {
          background: #eee;
        }

        .admin-confirm {
          background: #111;
          color: white;
        }

        .admin-empty {
          text-align: center;
          padding: 35px 10px;
          color: #777;
        }

        @media (max-width: 430px) {
          .flavor-admin-row {
            grid-template-columns: 1fr 90px 40px;
          }
        }

      </style>
    `;

    document.body.appendChild(panel);

    document.querySelector("#closeAdmin").onclick =
      closeAdminPanel;

    document.querySelector("#adminOverlay").onclick =
      event => {
        if (
          event.target.id === "adminOverlay"
        ) {
          closeAdminPanel();
        }
      };

    document.querySelector("#addProductAdmin").onclick =
      () => openProductForm();

    document.querySelector("#saveProductsAdmin").onclick =
      saveAdminProducts;
  }

  panel.style.display = "block";

  renderAdminProducts();
}

// ===============================
// ЗАКРЫТЬ АДМИНКУ
// ===============================

function closeAdminPanel() {
  const panel =
    document.querySelector("#adminPanel");

  if (panel) {
    panel.style.display = "none";
  }
}

// ===============================
// СПИСОК ТОВАРОВ В АДМИНКЕ
// ===============================

function renderAdminProducts() {

  const container =
    document.querySelector("#adminProducts");

  if (!container) return;

  if (!products.length) {
    container.innerHTML = `
      <div class="admin-empty">
        Товаров пока нет
      </div>
    `;
    return;
  }

  container.innerHTML = products
    .map(product => {

      const flavors =
        Array.isArray(product.flavors)
          ? product.flavors
          : [];

      return `
        <div
          class="admin-card"
          data-id="${product.id}"
        >

          <div class="admin-card-top">

            <img
              class="admin-card-image"
              src="${escapeHtml(product.image || "logo.jpg")}"
              alt=""
            >

            <div class="admin-card-info">

              <div class="admin-card-name">
                ${escapeHtml(product.name)}
              </div>

              <div class="admin-card-category">
                ${escapeHtml(product.category || "Без категории")}
              </div>

            </div>

          </div>

          <div class="admin-flavors">

            ${
              flavors.length
                ? flavors.map(flavor => `
                    <span class="admin-flavor">
                      ${escapeHtml(flavor.name)}
                      ·
                      ${money(flavor.price)}
                    </span>
                  `).join("")
                : `
                    <span class="admin-flavor">
                      Нет вариантов
                    </span>
                  `
            }

          </div>

          <div class="admin-card-buttons">

            <button
              class="admin-edit"
              data-action="edit"
              data-id="${product.id}"
            >
              ✏️ Изменить
            </button>

            <button
              class="admin-delete"
              data-action="delete"
              data-id="${product.id}"
            >
              🗑 Удалить
            </button>

          </div>

        </div>
      `;
    })
    .join("");

  container
    .querySelectorAll("[data-action='edit']")
    .forEach(button => {
      button.onclick = () => {
        openProductForm(
          Number(button.dataset.id)
        );
      };
    });

  container
    .querySelectorAll("[data-action='delete']")
    .forEach(button => {
      button.onclick = () => {
        deleteProduct(
          Number(button.dataset.id)
        );
      };
    });
}

// ===============================
// ФОРМА ТОВАРА
// ===============================

function openProductForm(productId = null) {

  const existing =
    productId !== null
      ? products.find(
          p => Number(p.id) === Number(productId)
        )
      : null;

  const form =
    document.createElement("div");

  form.className =
    "admin-form";

  form.id =
    "activeProductForm";

  const categories = [
    "Жидкости",
    "Испарители",
    "Картриджи",
    "Одноразки",
    "Аксессуары"
  ];

  form.innerHTML = `
    <h3>
      ${existing ? "✏️ Изменить товар" : "➕ Новый товар"}
    </h3>

    <div class="admin-field">
      <label>Название товара</label>
      <input
        id="adminProductName"
        type="text"
        placeholder="Например: Annima Love"
        value="${escapeHtml(existing?.name || "")}"
      >
    </div>

    <div class="admin-field">
      <label>Категория</label>

      <select id="adminProductCategory">

        ${categories.map(cat => `
          <option
            value="${escapeHtml(cat)}"
            ${
              existing?.category === cat
                ? "selected"
                : ""
            }
          >
            ${escapeHtml(cat)}
          </option>
        `).join("")}

      </select>
    </div>

    <div class="admin-field">

      <label>Ссылка на изображение</label>

      <input
        id="adminProductImage"
        type="text"
        placeholder="https://..."
        value="${escapeHtml(existing?.image || "")}"
      >

    </div>

    <div class="admin-field">

      <label>Варианты и цены</label>

      <div id="adminFlavors"></div>

      <button
        type="button"
        class="add-flavor"
        id="addFlavorAdmin"
      >
        ➕ Добавить вариант
      </button>

    </div>

    <div class="admin-form-actions">

      <button
        type="button"
        class="admin-cancel"
        id="cancelProductForm"
      >
        Отмена
      </button>

      <button
        type="button"
        class="admin-confirm"
        id="confirmProductForm"
      >
        ${existing ? "Сохранить" : "Добавить"}
      </button>

    </div>
  `;

  const productsContainer =
    document.querySelector("#adminProducts");

  productsContainer.prepend(form);

  const flavorsContainer =
    form.querySelector("#adminFlavors");

  function addFlavorRow(
    name = "",
    price = ""
  ) {

    const row =
      document.createElement("div");

    row.className =
      "flavor-admin-row";

    row.innerHTML = `
      <input
        class="flavor-name-input"
        type="text"
        placeholder="Вариант"
        value="${escapeHtml(name)}"
      >

      <input
        class="flavor-price-input"
        type="number"
        min="0"
        placeholder="Цена"
        value="${escapeHtml(price)}"
      >

      <button
        type="button"
        class="remove-flavor"
      >
        ×
      </button>
    `;

    row
      .querySelector(".remove-flavor")
      .onclick = () => {
        row.remove();
      };

    flavorsContainer.appendChild(row);
  }

  if (
    existing &&
    Array.isArray(existing.flavors) &&
    existing.flavors.length
  ) {

    existing.flavors.forEach(flavor => {
      addFlavorRow(
        flavor.name,
        flavor.price
      );
    });

  } else {

    addFlavorRow();

  }

  form.querySelector("#addFlavorAdmin").onclick =
    () => addFlavorRow();

  form.querySelector("#cancelProductForm").onclick =
    () => form.remove();

  form.querySelector("#confirmProductForm").onclick =
    () => {

      const name =
        form.querySelector(
          "#adminProductName"
        ).value.trim();

      const category =
        form.querySelector(
          "#adminProductCategory"
        ).value;

      const image =
        form.querySelector(
          "#adminProductImage"
        ).value.trim();

      if (!name) {
        alert("Введите название товара.");
        return;
      }

      const flavorRows =
        form.querySelectorAll(
          ".flavor-admin-row"
        );

      const flavors = [];

      flavorRows.forEach(row => {

        const flavorName =
          row.querySelector(
            ".flavor-name-input"
          ).value.trim();

        const flavorPrice =
          Number(
            row.querySelector(
              ".flavor-price-input"
            ).value
          );

        if (
          flavorName &&
          !isNaN(flavorPrice)
        ) {
          flavors.push({
            name: flavorName,
            price: flavorPrice
          });
        }

      });

      if (!flavors.length) {
        alert(
          "Добавьте хотя бы один вариант товара."
        );
        return;
      }

      if (existing) {

        existing.name =
          name;

        existing.category =
          category;

        existing.image =
          image || "logo.jpg";

        existing.flavors =
          flavors;

      } else {

        const newId =
          products.length
            ? Math.max(
                ...products.map(
                  p => Number(p.id) || 0
                )
              ) + 1
            : 1;

        products.push({
          id: newId,
          name,
          category,
          image: image || "logo.jpg",
          flavors
        });
      }

      form.remove();

      renderAdminProducts();
      renderCategories();
      renderProducts();
    };
}

// ===============================
// УДАЛЕНИЕ ТОВАРА
// ===============================

function deleteProduct(productId) {

  const product =
    products.find(
      p => Number(p.id) === Number(productId)
    );

  if (!product) return;

  const confirmed =
    confirm(
      `Удалить товар «${product.name}»?`
    );

  if (!confirmed) return;

  products =
    products.filter(
      p => Number(p.id) !== Number(productId)
    );

  renderAdminProducts();
  renderCategories();
  renderProducts();
}

// ===============================
// СОХРАНЕНИЕ КАТАЛОГА
// ===============================

async function saveAdminProducts() {

  if (!isAdmin()) {
    alert("Доступ запрещён.");
    return;
  }

  const button =
    document.querySelector(
      "#saveProductsAdmin"
    );

  if (button) {
    button.disabled = true;
    button.textContent =
      "⏳ Сохранение...";
  }

  try {

    const user =
      tg?.initDataUnsafe?.user;

    if (!user) {
      throw new Error(
        "Не удалось определить Telegram пользователя."
      );
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

    if (!response.ok || !result.ok) {
      throw new Error(
        result.error ||
        "Не удалось сохранить каталог"
      );
    }

    if (tg?.showPopup) {

      tg.showPopup({
        title:
          "Готово 👻",

        message:
          "Каталог успешно сохранён.",

        buttons: [
          {
            type: "ok"
          }
        ]
      });

    } else {

      alert(
        "Каталог успешно сохранён."
      );
    }

  } catch (error) {

    console.error(
      "Ошибка сохранения:",
      error
    );

    alert(
      "Ошибка сохранения: " +
      error.message
    );

  } finally {

    if (button) {
      button.disabled = false;
      button.textContent =
        "💾 Сохранить изменения";
    }
  }
}

// =====================================================
// ЗАПУСК
// =====================================================

loadProducts();

createAdminButton();

renderCart();
```
