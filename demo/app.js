const contactFields = [
  { key: 'name', label: 'Nome' },
  { key: 'email', label: 'E-mail', type: 'email' },
  { key: 'phone', label: 'Telefone', type: 'tel' }
];

const modules = {
  produtos: { title: 'Produtos', fields: [
    { key: 'name', label: 'Produto' },
    { key: 'category', label: 'Categoria' },
    { key: 'stock', label: 'Estoque', type: 'number', step: '1' },
    { key: 'price', label: 'Preço (R$)', type: 'number', step: '0.01', money: true }
  ] },
  clientes: { title: 'Clientes', fields: contactFields },
  fornecedores: { title: 'Fornecedores', fields: contactFields },
  vendedores: { title: 'Vendedores', fields: contactFields },
  pedidos: { title: 'Pedidos', fields: [
    { key: 'client', label: 'Cliente', source: 'clientes' },
    { key: 'product', label: 'Produto', source: 'produtos' },
    { key: 'seller', label: 'Vendedor', source: 'vendedores' },
    { key: 'value', label: 'Valor (R$)', type: 'number', step: '0.01', money: true },
    { key: 'notes', label: 'Observações', optional: true }
  ] }
};

const examples = {
  produtos: [
    { id: 'p1', name: 'Whey de baunilha', category: 'Proteínas', stock: 24, price: 119.90 },
    { id: 'p2', name: 'Creatina monohidratada', category: 'Creatinas', stock: 36, price: 69.90 },
    { id: 'p3', name: 'Barra de cacau', category: 'Snacks', stock: 52, price: 8.50 }
  ],
  clientes: [
    { id: 'c1', name: 'Cliente Aurora', email: 'aurora@example.com', phone: '(00) 0000-0001' },
    { id: 'c2', name: 'Cliente Horizonte', email: 'horizonte@example.com', phone: '(00) 0000-0002' }
  ],
  fornecedores: [
    { id: 'f1', name: 'Distribuidora Exemplo', email: 'distribuidora@example.com', phone: '(00) 0000-0010' }
  ],
  vendedores: [
    { id: 'v1', name: 'Equipe Sol', email: 'sol@example.com', phone: '(00) 0000-0020' }
  ],
  pedidos: [
    { id: 'o1', client: 'c1', product: 'p1', seller: 'v1', value: 119.90, notes: 'Retirada' },
    { id: 'o2', client: 'c2', product: 'p2', seller: 'v1', value: 69.90, notes: '' }
  ]
};

const storageKey = 'erp-suplementos-demo:v1';
const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const screen = document.querySelector('#screen');
const editor = document.querySelector('#editor');
const form = document.querySelector('#record-form');
const fields = document.querySelector('#fields');
const feedback = document.querySelector('#feedback');
const formError = document.querySelector('#form-error');
const orderLinks = modules.pedidos.fields.filter(field => field.source);

let data = structuredClone(examples);
let activeEdit;
let changedInEditor = false;
try {
  const saved = JSON.parse(localStorage.getItem(storageKey));
  if (saved && Object.keys(modules).every(key => Array.isArray(saved[key]))) {
    data = saved;
  }
} catch {
  feedback.textContent = 'Os dados salvos estão indisponíveis. A demo abriu com os exemplos.';
}

function save(next, message) {
  localStorage.setItem(storageKey, JSON.stringify(next));
  data = next;
  render();
  feedback.textContent = message;
}

function element(tag, content, className) {
  const node = document.createElement(tag);
  if (content !== undefined) node.textContent = content;
  if (className) node.className = className;
  return node;
}

function button(label, variant, action) {
  const control = element('button', label, 'btn btn-sm btn-' + variant);
  control.type = 'button';
  control.addEventListener('click', action);
  return control;
}

function display(field, record) {
  const value = record[field.key];
  if (field.source) return data[field.source].find(item => item.id === value)?.name ?? '—';
  if (field.money) return currency.format(value);
  return value === '' ? '—' : value;
}

function listing(key, columns, editable) {
  const card = element('div', undefined, 'card');
  if (!data[key].length) {
    card.append(element('p', 'Nenhum registro cadastrado.', 'card-body m-0'));
    return card;
  }

  const scroll = element('div', undefined, 'table-responsive');
  scroll.tabIndex = 0;
  scroll.setAttribute('role', 'region');
  scroll.setAttribute('aria-label', modules[key].title);
  const table = element('table', undefined, 'table table-hover mb-0');
  const header = table.createTHead().insertRow();
  const headings = columns.map(field => field.label);
  if (editable) headings.push('Ações');
  for (const label of headings) {
    const heading = element('th', label);
    heading.scope = 'col';
    header.append(heading);
  }

  const body = table.createTBody();
  for (const record of data[key]) {
    const row = body.insertRow();
    for (const column of columns) row.insertCell().textContent = display(column, record);
    if (editable) {
      const actions = element('div', undefined, 'actions');
      actions.append(
        button('Editar', 'outline-primary', () => openEditor(key, record)),
        button('Excluir', 'outline-danger', () => removeRecord(key, record))
      );
      row.insertCell().append(actions);
    }
  }

  scroll.append(table);
  card.append(scroll);
  return card;
}

function dashboard() {
  const total = data.pedidos.reduce((sum, order) => sum + Math.round(order.value * 100), 0);
  const cards = [
    ['Total em pedidos', currency.format(total / 100)],
    ['Pedidos', data.pedidos.length],
    ['Produtos', data.produtos.length],
    ['Unidades em estoque', data.produtos.reduce((sum, product) => sum + product.stock, 0)]
  ];
  const metrics = element('div', undefined, 'metrics');
  for (const [label, value] of cards) {
    const card = element('div', undefined, 'card');
    card.append(element('span', label), element('strong', value));
    metrics.append(card);
  }
  screen.append(metrics, element('h2', 'Pedidos cadastrados', 'h4'),
    listing('pedidos', modules.pedidos.fields.filter(field => !field.optional), false));
}

function render() {
  const route = location.hash.slice(1);
  const key = Object.hasOwn(modules, route) ? route : 'painel';
  const heading = element('div', undefined, 'screen-heading');
  const title = element('h1', modules[key]?.title ?? 'Painel', 'h3');
  title.id = 'page-title';
  title.tabIndex = -1;
  document.title = title.textContent + ' | ERP Suplementos IA';
  heading.append(title);
  for (const link of document.querySelectorAll('nav a')) {
    if (link.hash === '#' + key) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  screen.replaceChildren(heading);
  if (key === 'painel') {
    dashboard();
    return;
  }
  heading.append(button('Novo registro', 'primary', () => openEditor(key)));
  screen.append(listing(key, modules[key].fields, true));
}

function openEditor(key, record) {
  feedback.textContent = '';
  if (key === 'pedidos' && orderLinks.some(field => !data[field.source].length)) {
    feedback.textContent = 'Cadastre pelo menos um cliente, um produto e um vendedor para criar um pedido.';
    return;
  }

  activeEdit = { key, record };
  changedInEditor = false;
  formError.textContent = '';
  document.querySelector('#editor-title').textContent =
    (record ? 'Editar registro' : 'Novo registro') + ' · ' + modules[key].title;
  fields.replaceChildren();
  for (const field of modules[key].fields) {
    const label = element('label');
    const input = field.source ? element('select') : element('input');
    input.name = field.key;
    input.required = !field.optional;
    if (field.source) {
      input.className = 'form-select';
      input.add(new Option('Selecione', ''));
      for (const item of data[field.source]) input.add(new Option(item.name, item.id));
    } else {
      input.className = 'form-control';
      input.type = field.type ?? 'text';
      if (field.type === 'number') {
        input.min = '0';
        input.step = field.step;
      }
    }
    input.value = record?.[field.key] ?? '';
    label.append(element('span', field.label), input);
    fields.append(label);
  }
  editor.showModal();
}

form.addEventListener('submit', event => {
  event.preventDefault();
  if (changedInEditor) {
    formError.textContent = 'Os dados mudaram em outra aba. Feche e abra o formulário novamente.';
    return;
  }
  const { key, record } = activeEdit;
  const values = new FormData(form);
  const updated = { id: record?.id ?? crypto.randomUUID() };
  for (const field of modules[key].fields) {
    const value = values.get(field.key).trim();
    if ((!field.optional && !value) ||
        (field.source && !data[field.source].some(item => item.id === value))) {
      formError.textContent = 'Confira o campo ' + field.label + '.';
      return;
    }
    updated[field.key] = field.type === 'number' ? Number(value) : value;
  }

  const rows = record
    ? data[key].map(item => item.id === record.id ? updated : item)
    : [...data[key], updated];
  try {
    save({ ...data, [key]: rows }, 'Registro salvo.');
    editor.close();
    screen.querySelector('h1').focus();
  } catch {
    formError.textContent = 'Não foi possível salvar os dados neste navegador.';
  }
});

function removeRecord(key, record) {
  const link = orderLinks.find(field => field.source === key);
  if (link && data.pedidos.some(order => order[link.key] === record.id)) {
    feedback.textContent = 'Este registro está vinculado a um pedido. Altere ou exclua o pedido antes.';
    return;
  }
  if (!confirm('Excluir este registro da demonstração?')) return;

  try {
    save({ ...data, [key]: data[key].filter(item => item.id !== record.id) }, 'Registro excluído.');
    screen.querySelector('h1').focus();
  } catch {
    feedback.textContent = 'Não foi possível excluir o registro neste navegador.';
  }
}

document.querySelector('#cancel').addEventListener('click', () => editor.close());
document.querySelector('#reset').addEventListener('click', () => {
  if (!confirm('Restaurar os exemplos e apagar as alterações deste navegador?')) return;
  try {
    save(structuredClone(examples), 'Dados de exemplo restaurados.');
  } catch {
    feedback.textContent = 'Não foi possível restaurar os dados neste navegador.';
  }
});

window.addEventListener('hashchange', () => {
  if (editor.open) editor.close();
  feedback.textContent = '';
  render();
  screen.querySelector('h1').focus();
});

window.addEventListener('storage', event => {
  if (event.key !== storageKey && event.key !== null) return;
  try {
    const saved = JSON.parse(event.newValue);
    data = saved ?? structuredClone(examples);
    changedInEditor = editor.open;
    render();
    feedback.textContent = 'Dados atualizados em outra aba.';
  } catch {
    feedback.textContent = 'Não foi possível carregar as mudanças da outra aba.';
  }
});

render();
