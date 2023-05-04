const deckId = "new";
const deckUrl = `https://deckofcardsapi.com/api/deck/${deckId}/shuffle/`;

// Tento objekt bude udržovat aktuální stav hry
const gameState = {
	stock: [], // karty v zásobovacím balíčku
	waste: [], // karty v odkládacím balíčku
	foundation: [], // karty na základnách
	tableau: [[], [], [], [], [], [], []], // karty na hracím poli
};

// Funkce pro získání nového balíčku karet
async function getNewDeck() {
	const response = await fetch(deckUrl);
	const data = await response.json();
	return data.deck_id;
}

// Funkce pro získání nových karet ze zásobovacího balíčku
async function drawCardsFromStock(number) {
	const response = await fetch(`https://deckofcardsapi.com/api/deck/${deckId}/draw/?count=${number}`);
	const data = await response.json();
	return data.cards;
}

// Funkce pro inicializaci hry
async function initGame() {
	const deckId = await getNewDeck();
	const cards = await drawCardsFromStock(28);
	gameState.stock = cards.slice();
	render();
}

// Funkce pro zobrazení karet na hrací ploše
function render() {
	// zobrazení karet v zásobovacím balíčku
	const stockDiv = document.getElementById("stock");
	stockDiv.innerHTML = "";
	const stockCardImg = document.createElement("img");
	stockCardImg.src = "https://deckofcardsapi.com/static/img/back.png";
	stockDiv.appendChild(stockCardImg);

	// zobrazení karet v odkládacím balíčku
	const wasteDiv = document.getElementById("waste");
	wasteDiv.innerHTML = "";
	if (gameState.waste.length > 0) {
		const wasteCard = gameState.waste[gameState.waste.length - 1];
		const wasteCardImg = document.createElement("img");
		wasteCardImg.src = wasteCard.image;
		wasteDiv.appendChild(wasteCardImg);
	}

	// zobrazení karet na základnách
	const foundationDiv = document.getElementById("foundation");
	foundationDiv.innerHTML = "";
	for (let i = 0; i < gameState.foundation.length; i++) {
		const foundationCard = gameState.foundation[i];
		const foundationCardImg = document.createElement("img");
		foundationCardImg.src = foundationCard.image;
		foundationDiv.appendChild(foundationCardImg);
	}

	// zobrazení karet na hracím poli
	const tableauDiv = document.getElementById("tableau");
	tableauDiv.innerHTML = "";
	for (let i = 0; i < gameState.tableau.length; i++) {
		const columnDiv = document.createElement("div");
		columnDiv.classList.add("column");
		for (let j = 0; j < gameState.tableau[i].length; j++) {
			const tableauCard = gameState.tableau[i][j];
			const tableauCardImg = document.createElement("img");
			tableauCardImg.src = tableauCard.image;
			tableauCardImg.classList.add("card");
			tableauCardImg.style.top = `${j * 20}px`;
			tableauCardImg.style.zIndex = j;
			columnDiv.appendChild(tableauCardImg);
		}
		tableauDiv.appendChild(columnDiv);
	}
}

// Funkce pro přesun karty mezi balíčky
function moveCard(from, to, card) {
	gameState[from] = gameState[from].filter((c) => c.code !== card.code);
	gameState[to].push(card);
	render();
}

// Funkce pro inicializaci událostí kliknutí na karty
function initEvents() {
	// událost pro kliknutí na kartu v zásobovacím balíčku
	const stockDiv = document.getElementById("stock");
	stockDiv.addEventListener("click", async () => {
		const cards = await drawCardsFromStock(1);
		gameState.stock.pop();
		gameState.waste.push(cards[0]);
		render();
	});

	// událost pro kliknutí na kartu v odkládacím balíčku
	const wasteDiv = document.getElementById("waste");
	wasteDiv.addEventListener("click", () => {
		const wasteCard = gameState.waste[gameState.waste.length - 1];
		if (gameState.foundation.length === 0) {
			gameState.foundation.push(wasteCard);
			gameState.waste.pop();
		} else {
			const foundationCard = gameState.foundation[gameState.foundation.length - 1];
			if (wasteCard.suit === foundationCard.suit && wasteCard.value === foundationCard.value + 1) {
				gameState.foundation.push(wasteCard);
				gameState.waste.pop();
			}
		}
		render();
	});

	// událost pro kliknutí na kartu na hracím poli
	const tableauDiv = document.getElementById("tableau");
	tableauDiv.addEventListener("click", (e) => {
		const cardImg = e.target;
		if (!cardImg.classList.contains("card")) {
			return;
		}
		const columnDiv = cardImg.parentNode;
		const columnIndex = Array.from(columnDiv.parentNode.children).indexOf(columnDiv);
		const cardIndex = Array.from(columnDiv.children).indexOf(cardImg);
		const column = gameState.tableau[columnIndex];
		const card = column[cardIndex];
		// Pokud je karta zakrytá, nemůže být přemístěna
		if (!card.faceUp) {
			return;
		}
		// Pokud je karta poslední v sloupci, může být přesunuta na odkládací balíček nebo na založení
		if (cardIndex === column.length - 1) {
			// Pokud je karta stejného druhu jako poslední karta na založení a o jednu hodnotu větší, může být přesunuta na založení
			if (gameState.foundation.length > 0) {
				const foundationCard = gameState.foundation[gameState.foundation.length - 1];
				if (card.suit === foundationCard.suit && card.value === foundationCard.value + 1) {
					gameState.foundation.push(card);
					column.pop();
				}
			}
			// Pokud není karta přemístěna na založení, může být přemístěna na odkládací balíček
			if (column.length > 0 && gameState.waste.length === 0) {
				gameState.waste.push(card);
				column.pop();
			}
		} else {
			// Pokud karta není poslední v sloupci, může být přesunuta na jiný sloupec
			const destinationColumnDiv = cardImg.parentNode.parentNode.children[columnIndex + 1];
			const destinationColumn = gameState.tableau[columnIndex + 1];
			const destinationColumnTopCard = destinationColumn[destinationColumn.length - 1];

			// Pokud cílový sloupec je prázdný, může být přemístěna pouze karta s hodnotou krále
			if (destinationColumn.length === 0 && card.value === "K") {
				moveCard(`tableau[${columnIndex}]`, `tableau[${columnIndex + 1}]`, card);
			}
			// Pokud cílový sloupec není prázdný, musí být karta přemístěna na kartu s hodnotou o jedna menší a opačné barvy
			else if (
				destinationColumnTopCard.value === parseInt(card.value) + 1 &&
				isOppositeColor(destinationColumnTopCard.suit, card.suit)
			) {
				moveCard(`tableau[${columnIndex}]`, `tableau[${columnIndex + 1}]`, card);
			}
		}
	});
	// událost pro kliknutí na kartu na založení
	const foundationDiv = document.getElementById("foundation");
	foundationDiv.addEventListener("click", (e) => {
		const cardImg = e.target;
		if (!cardImg.classList.contains("card")) {
			return;
		}
		const card = gameState.foundation[gameState.foundation.length - 1];
		if (cardImg.src === card.image) {
			gameState.foundation.pop();
			render();
		}
	});
}

// Funkce pro získání nového balíčku karet ze serveru
async function getNewDeck() {
	const response = await fetch("https://deckofcardsapi.com/api/deck/new/shuffle/?deck_count=1");
	const data = await response.json();
	return data.deck_id;
}

// Funkce pro přehrání karet ze serveru na zásobovací balíček
async function shuffleDeck(deckId) {
	const response = await fetch(`https://deckofcardsapi.com/api/deck/${deckId}/shuffle/`);
	const data = await response.json();
	return data.success;
}

// Funkce pro přehrání jedné karty ze zásobovacího balíčku na odkládací balíček
async function drawCard(deckId) {
	const response = await fetch(`https://deckofcardsapi.com/api/deck/${deckId}/draw/?count=1`);
	const data = await response.json();
	return data.cards[0];
}

// Funkce pro přehrání několika karet ze zásobovacího balíčku na odkládací balíček
async function drawCards(deckId, count) {
	const response = await fetch(`https://deckofcardsapi.com/api/deck/${deckId}/draw/?count=${count}`);
	const data = await response.json();
	return data.cards;
}

// Funkce pro ověření, zda jsou dvě barvy opačné
function isOppositeColor(suit1, suit2) {
	const redSuits = ["hearts", "diamonds"];
	const blackSuits = ["spades", "clubs"];
	if (redSuits.includes(suit1) && blackSuits.includes(suit2)) {
		return true;
	}
	if (blackSuits.includes(suit1) && redSuits.includes(suit2)) {
		return true;
	}
	return false;
}

// Funkce pro přemístění karty z jednoho sloupce do druhého
function moveCard(source, destination, card) {
	gameState[source].pop();
	gameState[destination].push(card);
	render();
}

// Funkce pro vykreslení herního stavu
function render() {
	// vykreslení zásobovacího balíčku
	const stockDiv = document.getElementById("stock");
	if (gameState.stock.length === 0) {
		stockDiv.innerHTML = "";
	} else {
		stockDiv.innerHTML = `<img class="card" src="https://deckofcardsapi.com/static/img/${gameState.stock[0].code}.png" alt="${gameState.stock[0].code}" />`;
	}

	// vykreslení odkládacího balíčku
	const wasteDiv = document.getElementById("waste");
	if (gameState.waste.length === 0) {
		wasteDiv.innerHTML = "";
	} else {
		wasteDiv.innerHTML = `<img class="card" src="${gameState.waste[gameState.waste.length - 1].image}" alt="${gameState.waste[gameState.waste.length - 1].code}" />`;
	}

	// vykreslení založení
	const foundationDiv = document.getElementById("foundation");
	foundationDiv.innerHTML = "";
	gameState.foundation.forEach((card) => {
		foundationDiv.innerHTML += `<img class="card" src="${card.image}" alt="${card.code}" />`;
	});

	// vykreslení sloupců
	const tableauDiv = document.getElementById("tableau");
	tableauDiv.innerHTML = "";
	gameState.tableau.forEach((column) => {
		const columnDiv = document.createElement("div");
		columnDiv.classList.add("column");
		columnDiv.addEventListener("click", (e) => {
			handleColumnClick(e, column);
		});
		column.forEach((card, index) => {
			// zjištění, zda je karta otočená čelem nahoru nebo dolů
			const isFaceUp = index === column.length - 1;
			// vytvoření elementu pro kartu
			const cardDiv = document.createElement("div");
			cardDiv.classList.add("card-wrapper");
			// přidání css třídy podle toho, zda je karta otočená čelem nahoru nebo dolů
			if (isFaceUp) {
				cardDiv.classList.add("face-up");
			} else {
				cardDiv.classList.add("face-down");
			}
			// přidání css třídy podle barvy karty
			if (card.suit === "hearts" || card.suit === "diamonds") {
				cardDiv.classList.add("red");
			} else {
				cardDiv.classList.add("black");
			}
			// přidání event listeneru pro přesouvání karty myší
			cardDiv.addEventListener("mousedown", (e) => {
				handleCardMouseDown(e, column, index);
			});
			// přidání event listeneru pro přesouvání karty dotykem
			cardDiv.addEventListener("touchstart", (e) => {
				handleCardTouchStart(e, column, index);
			});
			// přidání elementu pro obrázek karty
			const cardImg = document.createElement("img");
			cardImg.classList.add("card");
			cardImg.src = card.image;
			cardImg.alt = card.code;
			// přidání elementu pro číslo a barvu karty
			const cardNumber = document.createElement("div");
			cardNumber.classList.add("card-number");
			cardNumber.innerHTML = getCardNumberDisplay(card.value);
			// přidání elementů do obalového elementu
			cardDiv.appendChild(cardImg);
			cardDiv.appendChild(cardNumber);
			// přidání obalového elementu do sloupce
			columnDiv.appendChild(cardDiv);
			tableauDiv.appendChild(columnDiv);
		});
	});
}

// Funkce pro zpracování kliknutí na sloupec
function handleColumnClick(e, column) {
	// zjištění, zda je kliknutí na kartu nebo na prázdné místo
	const cardIndex = Array.from(e.currentTarget.children).indexOf(e.target.closest(".card-wrapper"));
	if (cardIndex !== -1) {
		handleCardClick(column, cardIndex);
	} else {
		handleEmptyColumnClick(column);
	}
}

// Funkce pro zpracování kliknutí na kartu
function handleCardClick(column, index) {
	const card = column[index];
	const destination = getValidMoveDestination(card);
	if (destination) {
		moveCard(column, destination, card);
	}
}

// Funkce pro zpracování kliknutí na prázdné místo ve sloupci
function handleEmptyColumnClick(column) {
	const card = gameState.waste.pop();
	if (card) {
		moveCard(gameState.waste, column, card);
	}
}

// Funkce pro zpracování stisknutí myši nad kartou
let dragCardDiv = null;
function handleCardMouseDown(e, column, index) {
	const cardDiv = e.currentTarget;
	const offset = getMouseOffset(cardDiv, e);
	dragCardDiv = createDragCardDiv(cardDiv);
	dragCardDiv.style.left = `${e.pageX - offset.x}px`;
	dragCardDiv.style.top = `${e.pageY - offset.y}px;`;
	document.body.appendChild(dragCardDiv);
};
// přidání event listeneru pro pohyb myši 
const handleMouseMove = (e) => {
	if (dragCardDiv != undefined && dragCardDiv != null) {
		dragCardDiv.style.left = `${e.pageX - offset.x}px`;
		dragCardDiv.style.top = `${e.pageY - offset.y}px`;
	}
};
document.addEventListener("mousemove", handleMouseMove);
// přidání event listeneru pro uvolnění myši
const handleMouseUp = (e) => {
	const dropColumn = getDropColumn(dragCardDiv, gameState.tableauColumns);
	if (dropColumn) {
		const card = column[index];
		const destination = getValidMoveDestination(card, dropColumn);
		if (destination) {
			moveCard(column, destination, card);
		}
	}
	document.removeEventListener("mousemove", handleMouseMove);
	document.removeEventListener("mouseup", handleMouseUp);
	dragCardDiv.remove();
};
document.addEventListener("mouseup", handleMouseUp);

// Funkce pro zpracování dotyku na kartu
function handleCardTouchStart(e, column, index) {
	const cardDiv = e.currentTarget;
	const touch = e.changedTouches[0];
	const offset = getMouseOffset(cardDiv, touch);
	const dragCardDiv = createDragCardDiv(cardDiv);
	dragCardDiv.style.left = `${touch.pageX - offset.x} px`;
	dragCardDiv.style.top = `${touch.pageY - offset.y} px`;
	document.body.appendChild(dragCardDiv);
	// přidání event listeneru pro pohyb prstu
	const handleTouchMove = (e) => {
		const touch = e.changedTouches[0];
		dragCardDiv.style.left = `${touch.pageX - offset.x} px`;
		dragCardDiv.style.top = `${touch.pageY - offset.y} px`;
	};
	document.addEventListener("touchmove", handleTouchMove, { passive: false });
	// přidání event listeneru pro uvolnění prstu
	const handleTouchEnd = (e) => {
		const touch = e.changedTouches[0];
		const dropColumn = getDropColumn(dragCardDiv, gameState.tableauColumns);
		if (dropColumn) {
			const card = column[index];
			const destination = getValidMoveDestination(card, dropColumn);
			if (destination) {
				moveCard(column, destination, card);
			}
		}
		document.removeEventListener("touchmove", handleTouchMove);
		document.removeEventListener("touchend", handleTouchEnd);
		dragCardDiv.remove();
	};
	document.addEventListener("touchend", handleTouchEnd, { passive: false });
}

// Funkce pro získání offsetu myši nebo prstu vůči elementu
function getMouseOffset(element, event) {
	const rect = element.getBoundingClientRect();
	const offsetX = event.clientX - rect.left;
	const offsetY = event.clientY - rect.top;
	return { x: offsetX, y: offsetY };
}

// Funkce pro vytvoření elementu pro tažení karty
function createDragCardDiv(cardDiv) {
	const dragCardDiv = document.createElement("div");
	dragCardDiv.classList.add("card-wrapper", "dragging");
	dragCardDiv.style.width = `${cardDiv.offsetWidth} px`;
	dragCardDiv.style.height = `${cardDiv.offsetHeight} px`;
	const cardImg = cardDiv.querySelector(".card");
	const cardImgClone = cardImg.cloneNode(true);
	dragCardDiv.appendChild(cardImgClone);
	return dragCardDiv;
}

// Funkce pro získání sloupce, do kterého se má karta přesunout
function getDropColumn(dragCardDiv, columns) {
	for (let i = 0; i < columns.length; i++) {
		const columnDiv = columns[i].element;
		const rect = columnDiv.getBoundingClientRect();
		if (
			dragCardDiv.offsetLeft >= rect.left &&
			dragCardDiv.offsetLeft <= rect.right &&
			dragCardDiv.offsetTop >= rect.top &&
			dragCardDiv.offsetTop <= rect.bottom
		) {
			return columns[i];
		}
	}
	return null;
}

// Funkce pro získání cílové pozice karty v sloupci
function getValidMoveDestination(card, column) {
	if (column.length === 0 && card.value === "K") {
		return column;
	} else if (column.length > 0) {
		const lastCard = column[column.length - 1];
		if (
			lastCard.color !== card.color &&
			card.rank === lastCard.rank - 1
		) {
			return column;
		}
	}
	return null;
}

// Funkce pro přesunutí karty na cílovou pozici v novém sloupci
function moveCard(sourceColumn, destinationColumn, card) {
	const sourceIndex = sourceColumn.indexOf(card);
	const cardsToMove = sourceColumn.slice(sourceIndex);
	sourceColumn.splice(sourceIndex, cardsToMove.length);
	destinationColumn.push(cardsToMove);
	render();
	checkWin();
}

// Funkce pro kontrolu, zda hráč vyhrál hru
function checkWin() {
	if (
		gameState.foundationDiamonds.length === 13 &&
		gameState.foundationClubs.length === 13 &&
		gameState.foundationHearts.length === 13 &&
		gameState.foundationSpades.length === 13
	) {
		alert("Gratulujeme, vyhrál jste!");
	}
}

// Inicializace hry
initGame();
