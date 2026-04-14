const state = {
  items: [],
  queue: [],
  currentItem: null,
  answerVisible: false,
  loading: true,
  score: {
    total: 0,
    correct: 0,
    skipped: 0,
  },
  filters: {
    category: "all",
    listQuery: "",
  },
  view: "quiz",
  listSearchComposing: false,
  lastResult: null,
};

const app = document.querySelector("#app");
const priceFormatter = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
  maximumFractionDigits: 0,
});

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeAnswer(value) {
  return (value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[・･\-ー()（）［］[\]【】,，.。]/g, "");
}

function shuffle(array) {
  const clone = [...array];
  for (let i = clone.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [clone[i], clone[j]] = [clone[j], clone[i]];
  }
  return clone;
}

function sanitizeItems(items) {
  return items
    .filter((item) => {
      if (!item?.answer || !item?.image_url) return false;
      if (item?.source_image_url?.includes("/images/category/")) return false;
      return true;
    })
    .map((item) => ({
      ...item,
      categories: [...new Set(item.categories || [])],
    }));
}

function availableItems() {
  return state.items.filter((item) => {
    return (
      state.filters.category === "all" ||
      item.categories.includes(state.filters.category)
    );
  });
}

function productListItems() {
  const query = normalizeAnswer(state.filters.listQuery);
  const items = availableItems();
  if (!query) return items;

  return items.filter((item) => {
    const searchable = [
      item.answer,
      item.product_code,
      ...(item.categories || []),
    ].join(" ");
    return normalizeAnswer(searchable).includes(query);
  });
}

function ensureQueue() {
  if (state.queue.length > 0) return;
  state.queue = shuffle(availableItems());
}

function nextQuestion() {
  ensureQueue();
  state.currentItem = state.queue.shift() || null;
  state.answerVisible = false;
  state.lastResult = null;
  render();
}

function resetQuiz() {
  state.queue = [];
  state.currentItem = null;
  state.answerVisible = false;
  state.lastResult = null;
  nextQuestion();
}

function categoryOptions() {
  const categories = new Set();
  for (const item of state.items) {
    for (const category of item.categories) {
      categories.add(category);
    }
  }
  return ["all", ...Array.from(categories).sort((a, b) => a.localeCompare(b, "ja"))];
}

function scoreRate() {
  if (state.score.total === 0) return "0%";
  return `${Math.round((state.score.correct / state.score.total) * 100)}%`;
}

function currentProgress() {
  const total = availableItems().length;
  return `${state.score.total} / ${total}`;
}

function resultTone(result) {
  if (!result) return "";
  return result.correct ? "result result-correct" : "result result-wrong";
}

function formatPrice(price) {
  if (typeof price !== "number") return "";
  return priceFormatter.format(price);
}

function renderProductList(items) {
  if (items.length === 0) {
    return `
      <section class="product-list product-list-empty">
        <div class="empty-state">
          <h2>該当する商品はありません</h2>
          <p>カテゴリや検索キーワードを変えてください。</p>
        </div>
      </section>
    `;
  }

  return `
    <section class="product-list" aria-label="商品一覧">
      <div class="list-header">
        <div>
          <p class="eyebrow">Product List</p>
          <h2>商品一覧</h2>
        </div>
        <span>${items.length}件</span>
      </div>
      <div class="product-grid">
        ${items
          .map(
            (item) => `
              <article class="product-card">
                <div class="product-thumb">
                  <img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(
                    item.answer,
                  )}" loading="lazy" />
                </div>
                <div class="product-info">
                  <div class="chips">
                    ${(item.categories || [])
                      .map((category) => `<span class="chip">${escapeHtml(category)}</span>`)
                      .join("")}
                  </div>
                  <h3>${escapeHtml(item.answer)}</h3>
                  <div class="product-meta">
                    <span>${escapeHtml(item.product_code)}</span>
                    ${
                      formatPrice(item.price_jpy)
                        ? `<span>${escapeHtml(formatPrice(item.price_jpy))}</span>`
                        : ""
                    }
                  </div>
                  <a href="${escapeHtml(
                    item.product_url,
                  )}" target="_blank" rel="noreferrer">商品ページを開く</a>
                </div>
              </article>
            `,
          )
          .join("")}
      </div>
    </section>
  `;
}

function render() {
  if (state.loading) {
    app.innerHTML = `
      <main class="shell loading-shell">
        <section class="hero">
          <p class="eyebrow">ANGFA Product Quiz</p>
          <h1>問題を読み込み中です</h1>
        </section>
      </main>
    `;
    return;
  }

  const current = state.currentItem;
  const categories = categoryOptions();
  const filteredCount = availableItems().length;
  const listItems = productListItems();
  const disabled = filteredCount === 0;

  app.innerHTML = `
    <main class="shell">
      <section class="hero">
        <div>
          <p class="eyebrow">ANGFA Product Quiz</p>
          <h1>NAME HUNT</h1>
        </div>
        <div class="stats-panel">
          <div class="stat-card">
            <span>正解率</span>
            <strong>${scoreRate()}</strong>
          </div>
          <div class="stat-card">
            <span>正解数</span>
            <strong>${state.score.correct}</strong>
          </div>
          <div class="stat-card">
            <span>進行</span>
            <strong>${currentProgress()}</strong>
          </div>
        </div>
      </section>

      <section class="controls">
        <label>
          <span>カテゴリ</span>
          <select id="categorySelect">
            ${categories
              .map(
                (category) => `
                  <option value="${category}" ${
                    category === state.filters.category ? "selected" : ""
                  }>
                    ${category === "all" ? "すべて" : category}
                  </option>
                `,
              )
              .join("")}
          </select>
        </label>
        ${
          state.view === "list"
            ? `
              <label>
                <span>商品検索</span>
                <input
                  id="listSearchInput"
                  type="text"
                  value="${escapeHtml(state.filters.listQuery)}"
                  placeholder="商品名・コードで検索"
                  autocomplete="off"
                  spellcheck="false"
                />
              </label>
            `
            : ""
        }
        <div class="view-switch" aria-label="表示切替">
          <button
            type="button"
            id="quizViewButton"
            class="button ${state.view === "quiz" ? "" : "button-secondary"}"
            aria-pressed="${state.view === "quiz"}"
          >
            クイズ
          </button>
          <button
            type="button"
            id="listViewButton"
            class="button ${state.view === "list" ? "" : "button-secondary"}"
            aria-pressed="${state.view === "list"}"
          >
            商品一覧
          </button>
        </div>
        ${
          state.view === "quiz"
            ? `<button id="resetButton" class="button button-secondary">はじめからやり直す</button>`
            : ""
        }
      </section>

      ${
        state.view === "list"
          ? renderProductList(listItems)
          : `
            <section class="board ${disabled ? "board-empty" : ""}">
              ${
                disabled
                  ? `
                    <div class="empty-state">
                      <h2>このカテゴリの問題はありません</h2>
                      <p>別のカテゴリを選んでください。</p>
                    </div>
                  `
                  : `
                    <div class="question-panel">
                      <div class="image-wrap">
                        ${
                          current
                            ? `<img src="${current.image_url}" alt="quiz product" class="product-image" />`
                            : `<div class="image-fallback">問題を準備できませんでした</div>`
                        }
                      </div>

                      <div class="question-meta">
                        <div class="chips">
                          ${current.categories
                            .map((category) => `<span class="chip">${category}</span>`)
                            .join("")}
                        </div>
                        <p class="hint">正式名称を入力してください。空白や記号の差はある程度吸収します。</p>
                      </div>
                    </div>

                    <form id="answerForm" class="answer-panel">
                      <label for="answerInput">回答</label>
                      <input
                        id="answerInput"
                        name="answer"
                        type="text"
                        placeholder="商品名を入力"
                        autocomplete="off"
                        spellcheck="false"
                      />
                      <div class="actions">
                        <button type="submit" class="button">判定する</button>
                        <button type="button" id="revealButton" class="button button-secondary">
                          答えを見る
                        </button>
                        <button type="button" id="skipButton" class="button button-ghost">
                          スキップ
                        </button>
                      </div>
                      <div class="${resultTone(state.lastResult)}">
                        ${
                          state.lastResult
                            ? `
                              <strong>${state.lastResult.correct ? "正解" : "不正解"}</strong>
                              <span>${state.lastResult.message}</span>
                            `
                            : ""
                        }
                      </div>
                      ${
                        state.answerVisible
                          ? `
                            <div class="answer-card">
                              <span>正解</span>
                              <strong>${current.answer}</strong>
                              <small>商品コード: ${current.product_code}</small>
                              <a href="${current.product_url}" target="_blank" rel="noreferrer">商品ページを開く</a>
                            </div>
                          `
                          : ""
                      }
                    </form>
                  `
              }
            </section>
          `
      }
    </main>
  `;

  bindEvents();
}

function judgeAnswer(formData) {
  if (!state.currentItem) return;
  const input = String(formData.get("answer") || "");
  const userAnswer = normalizeAnswer(input);
  const expected = normalizeAnswer(state.currentItem.answer);
  const correct = userAnswer.length > 0 && userAnswer === expected;

  state.score.total += 1;
  if (correct) {
    state.score.correct += 1;
  }

  state.answerVisible = true;
  state.lastResult = {
    correct,
    message: correct
      ? `${state.currentItem.answer} です。`
      : `入力: ${input || "未入力"} / 正解: ${state.currentItem.answer}`,
  };

  render();
}

function bindEvents() {
  const quizViewButton = document.querySelector("#quizViewButton");
  if (quizViewButton) {
    quizViewButton.addEventListener("click", () => {
      state.view = "quiz";
      render();
    });
  }

  const listViewButton = document.querySelector("#listViewButton");
  if (listViewButton) {
    listViewButton.addEventListener("click", () => {
      state.view = "list";
      render();
    });
  }

  const listSearchInput = document.querySelector("#listSearchInput");
  if (listSearchInput) {
    listSearchInput.addEventListener("compositionstart", () => {
      state.listSearchComposing = true;
    });

    listSearchInput.addEventListener("compositionend", (event) => {
      state.listSearchComposing = false;
      state.filters.listQuery = event.target.value;
      render();
    });

    listSearchInput.addEventListener("input", (event) => {
      state.filters.listQuery = event.target.value;
      if (state.listSearchComposing || event.isComposing) return;
      render();
    });
    listSearchInput.focus();
    listSearchInput.setSelectionRange(
      listSearchInput.value.length,
      listSearchInput.value.length,
    );
  }

  const categorySelect = document.querySelector("#categorySelect");
  if (categorySelect) {
    categorySelect.addEventListener("change", (event) => {
      state.filters.category = event.target.value;
      resetQuiz();
    });
  }

  const resetButton = document.querySelector("#resetButton");
  if (resetButton) {
    resetButton.addEventListener("click", () => {
      state.score = { total: 0, correct: 0, skipped: 0 };
      resetQuiz();
    });
  }

  const answerForm = document.querySelector("#answerForm");
  if (answerForm) {
    answerForm.addEventListener("submit", (event) => {
      event.preventDefault();
      judgeAnswer(new FormData(answerForm));
    });
  }

  const revealButton = document.querySelector("#revealButton");
  if (revealButton) {
    revealButton.addEventListener("click", () => {
      if (!state.currentItem) return;
      state.score.total += 1;
      state.lastResult = {
        correct: false,
        message: `正解は ${state.currentItem.answer} です。`,
      };
      state.answerVisible = true;
      render();
    });
  }

  const skipButton = document.querySelector("#skipButton");
  if (skipButton) {
    skipButton.addEventListener("click", () => {
      state.score.skipped += 1;
      nextQuestion();
    });
  }

  const answerCard = document.querySelector(".answer-card");
  if (answerCard) {
    const nextButton = document.createElement("button");
    nextButton.type = "button";
    nextButton.className = "button";
    nextButton.textContent = "次の問題へ";
    nextButton.addEventListener("click", () => {
      nextQuestion();
    });
    answerCard.appendChild(nextButton);
  }

  const answerInput = document.querySelector("#answerInput");
  if (answerInput) {
    answerInput.focus();
  }
}

async function boot() {
  try {
    const response = await fetch("./public/data/angfa-quiz-db.json");
    if (!response.ok) {
      throw new Error(`Failed to load quiz data: ${response.status}`);
    }
    const payload = await response.json();
    state.items = sanitizeItems(payload.items || []);
    state.loading = false;
    resetQuiz();
  } catch (error) {
    app.innerHTML = `
      <main class="shell loading-shell">
        <section class="hero">
          <p class="eyebrow">ANGFA Product Quiz</p>
          <h1>データの読み込みに失敗しました</h1>
          <p class="subtext">${error.message}</p>
        </section>
      </main>
    `;
  }
}

boot();
