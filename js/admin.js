// ============================================
// CONFIG: troque esta URL pelo link final do seu GitHub Pages
// Ex: "https://seuusuario.github.io/epi-sistema"
// ============================================
const URL_BASE_PUBLICA = window.location.origin + window.location.pathname.replace("admin.html", "");

let colaboradorAtualId = null;

// --- Proteção de rota: exige login ---
(async () => {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = "index.html";
  }
})();

document.getElementById("btn-sair").addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  window.location.href = "index.html";
});

// --- Carregar lista de colaboradores ---
async function carregarColaboradores(filtro = "") {
  const { data, error } = await supabaseClient
    .from("colaboradores")
    .select("*")
    .order("nome", { ascending: true });

  const container = document.getElementById("lista-colaboradores");
  const carregando = document.getElementById("carregando");
  carregando.style.display = "none";

  if (error) {
    container.innerHTML = `<p class="vazio">Erro ao carregar: ${error.message}</p>`;
    return;
  }

  let lista = data;
  if (filtro) {
    const f = filtro.toLowerCase();
    lista = data.filter(c => c.nome.toLowerCase().includes(f) || c.matricula.toLowerCase().includes(f));
  }

  if (lista.length === 0) {
    container.innerHTML = `<p class="vazio">Nenhum colaborador encontrado.</p>`;
    return;
  }

  container.innerHTML = lista.map(c => `
    <div class="lista-colaborador">
      <div class="info">
        <strong>${escapeHtml(c.nome)}</strong>
        <span>Matrícula: ${escapeHtml(c.matricula)} · ${escapeHtml(c.setor)}</span>
      </div>
      <div class="acoes">
        <button class="ver-qr" onclick="abrirFicha('${c.id}')">Ver ficha / QR</button>
        <button class="excluir" onclick="excluirColaborador('${c.id}', '${escapeHtml(c.nome)}')">Excluir</button>
      </div>
    </div>
  `).join("");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

document.getElementById("busca").addEventListener("input", (e) => {
  carregarColaboradores(e.target.value);
});

// --- Modal Novo/Editar colaborador ---
document.getElementById("btn-novo").addEventListener("click", () => {
  document.getElementById("modal-titulo").textContent = "Novo Colaborador";
  document.getElementById("form-colaborador").reset();
  document.getElementById("colab-id").value = "";
  abrirModal("modal-colaborador");
});

document.getElementById("form-colaborador").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.getElementById("colab-id").value;
  const payload = {
    nome: document.getElementById("colab-nome").value.trim(),
    matricula: document.getElementById("colab-matricula").value.trim(),
    setor: document.getElementById("colab-setor").value.trim(),
    funcao: document.getElementById("colab-funcao").value.trim() || null,
  };

  let error;
  if (id) {
    ({ error } = await supabaseClient.from("colaboradores").update(payload).eq("id", id));
  } else {
    ({ error } = await supabaseClient.from("colaboradores").insert(payload));
  }

  if (error) {
    alert("Erro ao salvar: " + error.message);
    return;
  }

  fecharModal("modal-colaborador");
  carregarColaboradores(document.getElementById("busca").value);
});

async function excluirColaborador(id, nome) {
  if (!confirm(`Excluir "${nome}"? Isso também apaga seus treinamentos e exames. Esta ação não pode ser desfeita.`)) return;
  const { error } = await supabaseClient.from("colaboradores").delete().eq("id", id);
  if (error) {
    alert("Erro ao excluir: " + error.message);
    return;
  }
  carregarColaboradores(document.getElementById("busca").value);
}

// --- Modal Ficha (treinamentos, exames, QR) ---
async function abrirFicha(id) {
  colaboradorAtualId = id;

  const { data: colab, error } = await supabaseClient
    .from("colaboradores")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    alert("Erro ao carregar colaborador: " + error.message);
    return;
  }

  document.getElementById("ficha-nome").textContent = colab.nome;
  document.getElementById("ficha-sub").textContent = `Matrícula ${colab.matricula} · ${colab.setor}`;

  // Gerar QR code apontando para a ficha pública
  const linkPublico = `${URL_BASE_PUBLICA}colaborador.html?id=${id}`;
  document.getElementById("link-publico-texto").textContent = linkPublico;

  const canvas = document.getElementById("qr-canvas");
  try {
    qrcodeGerar(canvas, linkPublico, 200);
  } catch (err) {
    console.error("Erro ao gerar QR code:", err);
    document.getElementById("qrcode-area").innerHTML = `<p class="vazio">Não foi possível gerar o QR code. Link: ${linkPublico}</p>`;
  }

  document.getElementById("btn-baixar-qr").onclick = () => {
    const link = document.createElement("a");
    link.download = `qrcode-${colab.matricula}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  await carregarTreinamentos(id);
  await carregarExames(id);

  abrirModal("modal-ficha");
}

// --- Treinamentos ---
async function carregarTreinamentos(colaboradorId) {
  const { data, error } = await supabaseClient
    .from("treinamentos")
    .select("*")
    .eq("colaborador_id", colaboradorId)
    .order("data_realizacao", { ascending: false });

  const container = document.getElementById("lista-treinamentos");
  if (error) {
    container.innerHTML = `<p class="vazio">Erro: ${error.message}</p>`;
    return;
  }
  if (!data.length) {
    container.innerHTML = `<p class="vazio">Nenhum treinamento cadastrado.</p>`;
    return;
  }
  container.innerHTML = data.map(t => `
    <div class="item-registro">
      <div>
        <div class="nome">${escapeHtml(t.nome)}</div>
        <div class="data">Realizado em ${formatarData(t.data_realizacao)}${t.data_validade ? " · Válido até " + formatarData(t.data_validade) : ""}</div>
      </div>
      <div>
        ${badgeStatus(t.data_validade)}
        <button onclick="excluirRegistro('treinamentos', '${t.id}')" style="margin-left:8px; border:none; background:none; color:#dc2626; cursor:pointer; font-size:12px;">Excluir</button>
      </div>
    </div>
  `).join("");
}

document.getElementById("form-treinamento").addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = {
    colaborador_id: colaboradorAtualId,
    nome: document.getElementById("trein-nome").value.trim(),
    data_realizacao: document.getElementById("trein-data").value,
    data_validade: document.getElementById("trein-validade").value || null,
  };
  const { error } = await supabaseClient.from("treinamentos").insert(payload);
  if (error) {
    alert("Erro ao salvar treinamento: " + error.message);
    return;
  }
  e.target.reset();
  carregarTreinamentos(colaboradorAtualId);
});

// --- Exames ---
async function carregarExames(colaboradorId) {
  const { data, error } = await supabaseClient
    .from("exames")
    .select("*")
    .eq("colaborador_id", colaboradorId)
    .order("data_realizacao", { ascending: false });

  const container = document.getElementById("lista-exames");
  if (error) {
    container.innerHTML = `<p class="vazio">Erro: ${error.message}</p>`;
    return;
  }
  if (!data.length) {
    container.innerHTML = `<p class="vazio">Nenhum exame cadastrado.</p>`;
    return;
  }
  container.innerHTML = data.map(ex => `
    <div class="item-registro">
      <div>
        <div class="nome">${escapeHtml(ex.tipo)}</div>
        <div class="data">Realizado em ${formatarData(ex.data_realizacao)}${ex.data_validade ? " · Válido até " + formatarData(ex.data_validade) : ""}</div>
      </div>
      <div>
        ${badgeStatus(ex.data_validade)}
        <button onclick="excluirRegistro('exames', '${ex.id}')" style="margin-left:8px; border:none; background:none; color:#dc2626; cursor:pointer; font-size:12px;">Excluir</button>
      </div>
    </div>
  `).join("");
}

document.getElementById("form-exame").addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = {
    colaborador_id: colaboradorAtualId,
    tipo: document.getElementById("exame-tipo").value.trim(),
    data_realizacao: document.getElementById("exame-data").value,
    data_validade: document.getElementById("exame-validade").value || null,
  };
  const { error } = await supabaseClient.from("exames").insert(payload);
  if (error) {
    alert("Erro ao salvar exame: " + error.message);
    return;
  }
  e.target.reset();
  carregarExames(colaboradorAtualId);
});

async function excluirRegistro(tabela, id) {
  if (!confirm("Excluir este registro?")) return;
  const { error } = await supabaseClient.from(tabela).delete().eq("id", id);
  if (error) {
    alert("Erro ao excluir: " + error.message);
    return;
  }
  if (tabela === "treinamentos") carregarTreinamentos(colaboradorAtualId);
  else carregarExames(colaboradorAtualId);
}

// --- Helpers ---
function formatarData(iso) {
  if (!iso) return "";
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

function badgeStatus(dataValidade) {
  if (!dataValidade) return `<span class="badge sem-validade">Sem validade</span>`;
  const hoje = new Date();
  hoje.setHours(0,0,0,0);
  const validade = new Date(dataValidade + "T00:00:00");
  const diffDias = Math.floor((validade - hoje) / (1000 * 60 * 60 * 24));

  if (diffDias < 0) return `<span class="badge vencido">Vencido</span>`;
  if (diffDias <= 30) return `<span class="badge vencendo">Vence em ${diffDias}d</span>`;
  return `<span class="badge valido">Válido</span>`;
}

function abrirModal(id) {
  document.getElementById(id).classList.add("aberto");
}
function fecharModal(id) {
  document.getElementById(id).classList.remove("aberto");
}

// --- Inicialização ---
carregarColaboradores();
