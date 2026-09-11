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

    console.log("Товары загружены:", products);

    renderCategories();
    renderProducts();

    if (document.querySelector("#adminPanel")) {
      renderAdminProducts();
    }

  } catch (error) {
    console.error("Ошибка загрузки товаров:", error);

    const productsContainer =
      document.getElementById("products");

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

const categoriesEl =
  document.querySelector("#categories");

const productsEl =
  document.querySelector("#products");

const searchEl =
  document.querySelector("#search");

const cartButton =
  document.querySelector("#cartButton");

const cartTotal =
  document.querySelector("#cartTotal");

const sheetTotal =
  document.querySelector("#sheetTotal");

const cartItems =
  document.querySelector("#cartItems");

const sheet =
  document.querySelector("#cartSheet");

const backdrop =
  document.querySelector("#backdrop");

// ===============================
// ВСПОМОГАТЕЛЬНЫЕ
// ===============================

function money(n) {
  return new Intl.NumberFormat("ru-RU").format(n) + " ₽";
}

// ===============================
// КАТЕГОРИИ
// ===============================

function renderCategories() {

  const cats = [
    "Все",
    ...new Set(
      products.map(p => p.category)
    )
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

        category =
          button.dataset.category;

        renderCategories();
        renderProducts();
      };

    });
}

// ===============================
// КАТАЛОГ
// ===============================

function renderProducts() {

  const q =
    searchEl.value
      .trim()
      .toLowerCase();

  const list =
    products.filter(product => {

      const categoryMatch =
        category === "Все" ||
        product.category === category;

      const searchMatch =
        product.name
          .toLowerCase()
          .includes(q);

      return categoryMatch && searchMatch;
    });

  productsEl.innerHTML =
    list
      .map(product => {

        const prices =
          Array.isArray(product.flavors)
            ? product.flavors.map(f => Number(f.price))
            : [0];

        const minPrice =
          prices.length
            ? Math.min(...prices)
            : 0;

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
// ВЫБОР ВАРИАНТА
// ===============================

function openFlavorSelector(productId) {

  selectedProduct =
    products.find(
      p => p.id === productId
    );

  if (!selectedProduct) return;

  let modal =
    document.querySelector("#flavorModal");

  if (!modal) {

    modal =
      document.createElement("div");

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

    document.querySelector("#closeFlavor")
      .onclick = closeFlavorSelector;

    modal
      .querySelector(".flavor-overlay")
      .onclick = event => {

        if (
          event.target.classList
            .contains("flavor-overlay")
        ) {
          closeFlavorSelector();
        }

      };
  }

  document.querySelector("#flavorImage").src =
    selectedProduct.image || "logo.jpg";

  document.querySelector("#flavorTitle")
    .textContent =
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
// КОРЗИНА
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

function changeQty(
  productId,
  flavorName,
  delta
) {

  const item =
    cart.find(x =>
      x.productId === productId &&
      x.flavorName === flavorName
    );

  if (!item) return;

  item.qty += delta;

  if (item.qty <= 0) {

    cart =
      cart.filter(x =>
        !(
          x.productId === productId &&
          x.flavorName === flavorName
        )
      );
  }

  renderCart();
}

function renderCart() {

  const total =
    cart.reduce(
      (sum, item) =>
        sum +
        item.price *
        item.qty,
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
    cart
      .map(item => `
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

cartButton.onclick =
  openCart;

document.querySelector("#closeCart")
  .onclick =
    closeCart;

backdrop.onclick =
  closeCart;

// ===============================
// ПОИСК
// ===============================

searchEl.oninput =
  renderProducts;

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

    const total =
      cart.reduce(
        (sum, item) =>
          sum +
          item.price *
          item.qty,
        0
      );

    const items =
      cart.map(item => ({
        name:
          `${item.productName} — ${item.flavorName}`,
        price: item.price,
        qty: item.qty
      }));

    const user =
      tg?.initDataUnsafe?.user ||
      null;

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

            body:
              JSON.stringify({
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

// =====================================================
// АДМИН-ПАНЕЛЬ GHOSTMARKET
// =====================================================

const ADMIN_ID =
  "1710854749";

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
  ) return;

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

  button.onclick =
    openAdminPanel;

  document
    .querySelector(".app")
    .prepend(button);
}

// ===============================
// АДМИНКА
// ===============================

function openAdminPanel() {

  let panel =
    document.querySelector(
      "#adminPanel"
    );

  if (!panel) {

    panel =
      document.createElement("div");

    panel.id =
      "adminPanel";

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

          <button
            id="addProductAdmin"
            class="g
```
