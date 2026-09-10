const tg = window.Telegram?.WebApp;
if (tg) { tg.ready(); tg.expand(); }

const products = [
  {id:1,name:"Товар 01",category:"Новинки",price:650,image:"logo.jpg"},
  {id:2,name:"Товар 02",category:"Хиты",price:750,image:"logo.jpg"},
  {id:3,name:"Товар 03",category:"Новинки",price:900,image:"logo.jpg"},
  {id:4,name:"Товар 04",category:"Аксессуары",price:500,image:"logo.jpg"}
];

let category="Все";
let cart=[];

const categoriesEl=document.querySelector("#categories");
const productsEl=document.querySelector("#products");
const searchEl=document.querySelector("#search");
const cartButton=document.querySelector("#cartButton");
const cartTotal=document.querySelector("#cartTotal");
const sheetTotal=document.querySelector("#sheetTotal");
const cartItems=document.querySelector("#cartItems");
const sheet=document.querySelector("#cartSheet");
const backdrop=document.querySelector("#backdrop");

function money(n){return new Intl.NumberFormat("ru-RU").format(n)+" ₽"}

function renderCategories(){
  const cats=["Все",...new Set(products.map(p=>p.category))];
  categoriesEl.innerHTML=cats.map(c=>`<button class="category ${c===category?"active":""}" data-category="${c}">${c}</button>`).join("");
  categoriesEl.querySelectorAll(".category").forEach(b=>b.onclick=()=>{category=b.dataset.category;renderCategories();renderProducts()});
}

function renderProducts(){
  const q=searchEl.value.trim().toLowerCase();
  const list=products.filter(p=>(category==="Все"||p.category===category)&&p.name.toLowerCase().includes(q));
  productsEl.innerHTML=list.map(p=>`
    <article class="product">
      <img class="product-img" src="${p.image}" alt="">
      <div class="product-body">
        <div class="product-name">${p.name}</div>
        <div class="product-meta">${p.category}</div>
        <div class="product-bottom">
          <span class="price">${money(p.price)}</span>
          <button class="add" data-id="${p.id}">В корзину</button>
        </div>
      </div>
    </article>`).join("") || `<div class="empty" style="grid-column:1/-1"><h2>Ничего не найдено</h2></div>`;
  productsEl.querySelectorAll(".add").forEach(b=>b.onclick=()=>addToCart(+b.dataset.id));
}

function addToCart(id){
  const item=cart.find(x=>x.id===id);
  if(item)item.qty++; else cart.push({id,qty:1});
  renderCart();
  openCart();
}
function changeQty(id,delta){
  const item=cart.find(x=>x.id===id); if(!item)return;
  item.qty+=delta;if(item.qty<=0)cart=cart.filter(x=>x.id!==id);
  renderCart();
}
function renderCart(){
  const total=cart.reduce((s,x)=>s+(products.find(p=>p.id===x.id).price*x.qty),0);
  cartTotal.textContent=money(total);sheetTotal.textContent=money(total);
  cartButton.classList.toggle("hidden",cart.length===0);
  cartItems.innerHTML=cart.length?cart.map(x=>{
    const p=products.find(p=>p.id===x.id);
    return `<div class="cart-row">
      <img src="${p.image}" alt=""><div class="cart-info"><b>${p.name}</b><div class="product-meta">${money(p.price)} × ${x.qty}</div></div>
      <div class="qty"><button onclick="changeQty(${p.id},-1)">−</button><b>${x.qty}</b><button onclick="changeQty(${p.id},1)">+</button></div>
    </div>`;
  }).join(""):`<div class="empty"><h2>Корзина пуста</h2></div>`;
}
function openCart(){sheet.classList.add("open");backdrop.classList.add("open")}
function closeCart(){sheet.classList.remove("open");backdrop.classList.remove("open")}

cartButton.onclick=openCart;
document.querySelector("#closeCart").onclick=closeCart;
backdrop.onclick=closeCart;
searchEl.oninput=renderProducts;

document.querySelectorAll(".tab").forEach(tab=>tab.onclick=()=>{
  document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
  document.querySelectorAll(".screen").forEach(x=>x.classList.remove("active"));
  tab.classList.add("active");document.querySelector("#"+tab.dataset.tab).classList.add("active");
});

document.querySelector("#checkoutButton").onclick=()=>{
  if(!cart.length)return;
  if(tg?.showPopup){
    tg.showPopup({title:"Оформление заказа",message:"Демо-режим: подключим отправку заказа на следующем этапе.",buttons:[{type:"ok"}]});
  }else alert("Демо-режим: подключим отправку заказа на следующем этапе.");
};

renderCategories();renderProducts();renderCart();
