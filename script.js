import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
    getFirestore, 
    doc, 
    setDoc, 
    onSnapshot, 
    collection, 
    deleteDoc, 
    addDoc,
    query,
    where 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

import { 
    getAuth, 
    signInAnonymously, 
    onAuthStateChanged, 
    signOut,
    signInWithEmailAndPassword,    
    createUserWithEmailAndPassword, 
    GoogleAuthProvider,            
    signInWithPopup                
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

// Tabla oficial de puntos UIPM basada en tu imagen
const UipmPoints = {
    1: 250, 2: 244, 3: 238, 4: 236, 5: 230, 6: 228, 7: 226, 8: 224, 9: 218, 10: 216,
    11: 214, 12: 212, 13: 210, 14: 208, 15: 206, 16: 204, 17: 198, 18: 196,
    19: 194, 20: 192, 21: 190, 22: 188, 23: 186, 24: 184, 25: 182, 26: 180, 
    27: 178, 28: 176, 29: 174, 30: 172, 31: 170, 32: 168, 33: 166, 34: 164, 
    35: 162, 36: 160, 37: 158, 38: 156, 39: 154, 40: 152
};

const firebaseConfig = {
  apiKey: "AIzaSyAtWCkDlZuv11AueTW6WEPNwAn97Vf-3yQ",
  authDomain: "pentatlon-scores.firebaseapp.com",
  projectId: "pentatlon-scores",
  storageBucket: "pentatlon-scores.firebasestorage.app",
  messagingSenderId: "650229123946",
  appId: "1:650229123946:web:a3769c31f8ce1a23edb313"
};
const appId = 'penta-tourney-v2';
let firebaseApp, auth, db;
let players = []; 
let events = []; 
let discData = []; 
let isAdmin = false;
let currentEventTitle = "";
let currentFiltersInfo = "";


   async function start() {
    try {
        if (!firebaseApp) {
            firebaseApp = initializeApp(firebaseConfig); 
            auth = getAuth(firebaseApp); 
            db = getFirestore(firebaseApp);
        }
        
        onAuthStateChanged(auth, (user) => {
            // Hacemos visible el body
            document.body.style.display = 'block';

            // Buscamos el ID correcto: authSection
            const section = document.getElementById('authSection');
            if (section) {
                section.classList.remove('hidden');
                section.style.display = 'block';
            }

            const path = window.location.pathname;
            const isAtLogin = path === '/' || path.endsWith('index.html') || path === '' || path === '/index.html';

            if (user) { 
                if (isAtLogin) {
                    window.location.replace('Penta.html');
                } else if (typeof setupListeners === "function") {
                    setupListeners(); 
                }
            } else { 
                if (!isAtLogin && !path.includes('registro.html')) {
                    window.location.replace('index.html'); 
                }
            }
        });
    } catch (error) {
        console.error("Error en arranque:", error);
        document.body.style.display = 'block';
    }
}

window.logoutSession = async () => {
    try { 
        await signOut(auth); 
    } catch (error) { 
        window.location.href = 'index.html'; 
    }
};

window.selectedAthlete = null;

if (!window.bracketWinners) {
    window.bracketWinners = {
        round32: Array(32).fill(""),
        round16: Array(16).fill(""),
        round8: Array(8).fill(""),
        semi: Array(4).fill(""),
        campeon: null
    };
}

window.openAdvanceManager = () => {
    const modal = document.getElementById('advanceManagerModal');
    const containerIzquierdo = document.getElementById('advanceAtletasList');
    
    if (!modal) return;

    if (containerIzquierdo && window.players) {
        containerIzquierdo.innerHTML = window.players.map(p => `
            <div class="flex justify-between items-center bg-slate-800 p-2 rounded mb-2 border border-slate-700">
                <span class="text-[10px] text-white uppercase font-bold">${p.name}</span>
                <button onclick="window.marcarParaMover('${p.name}', this)" 
                        class="btn-atleta bg-purple-600 text-[9px] px-2 py-1 rounded font-black uppercase">
                    Elegir
                </button>
            </div>
        `).join('');
    }

    modal.classList.remove('hidden');

    setTimeout(() => {
        window.dibujarRondas();
    }, 50); 
};

window.marcarParaMover = (nombre, boton) => {
    window.selectedAthlete = nombre;
    document.querySelectorAll('.btn-atleta').forEach(b => {
        b.classList.replace('bg-green-500', 'bg-purple-600');
        b.innerText = "Elegir";
    });
    boton.classList.replace('bg-purple-600', 'bg-green-500');
    boton.innerText = "LISTO";
};

window.colocarEnLlave = (ronda, index) => {
    if (!window.selectedAthlete) {
        alert("Selecciona un atleta a la izquierda primero.");
        return;
    }
    window.bracketData[ronda][index] = window.selectedAthlete;
    window.dibujarRondas(); 
};

window.dibujarRondas = () => {
    const dest = document.getElementById('advanceDestinations');
    if (!dest) {
        console.error("No se encontró el div 'advanceDestinations'");
        return;
    }

    const esquema = [
        { id: 'round32', titulo: 'ROUND 32 (16 COMBATES)', slots: 32 },
        { id: 'round16', titulo: 'ROUND 16 (8 COMBATES)', slots: 16 },
        { id: 'round8', titulo: 'ROUND 8 (CUARTOS)', slots: 8 },
        { id: 'semi', titulo: 'SEMIFINAL', slots: 4 },
        { id: 'final', titulo: 'FINAL', slots: 2 }
    ];

    dest.innerHTML = esquema.map(r => `
        <div class="mb-6">
            <h5 class="text-[10px] text-cyan-400 font-black mb-2 border-b border-slate-800 pb-1">${r.titulo}</h5>
            <div class="grid grid-cols-2 gap-2">
                ${window.bracketData[r.id].map((atleta, i) => `
                    <button onclick="window.colocarEnLlave('${r.id}', ${i})" 
                            class="text-left p-2 rounded text-[10px] border h-9 transition-all
                            ${atleta ? 'bg-purple-600/30 border-purple-500 text-white font-bold' : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-600'}">
                        <span class="opacity-40 mr-1">${i + 1}.</span> ${atleta || '---'}
                    </button>
                `).join('')}
            </div>
        </div>
    `).join('');

    window.refreshDestinations(); // Dibujar la derecha
    modal.classList.remove('hidden');    
};

    


// PASO 1: Seleccionar el atleta de la izquierda
window.prepareSelection = (name, btn) => {
    window.selectedAthlete = name;
    
    // Resetear visualmente todos los botones de la lista de atletas
    document.querySelectorAll('.btn-select-atleta').forEach(b => {
        b.classList.remove('bg-green-500');
        b.classList.add('bg-purple-600');
        b.innerText = "Seleccionar";
    });
    
    // Marcar el seleccionado
    btn.classList.replace('bg-purple-600', 'bg-green-500');
    btn.innerText = "LISTO";
};

// PASO 2: Pegar el atleta en un round a la derecha
window.assignToSlot = (roundId, index) => {
    if (!window.selectedAthlete) {
        alert("Primero selecciona un atleta de la lista de la izquierda.");
        return;
    }
    
    // Guardamos en bracketWinners para que el PDF lo reconozca
    window.bracketWinners[roundId][index] = window.selectedAthlete;
    
    // Refrescar visualmente la columna derecha
    window.refreshAdvanceDestinations();
};

window.assignToWinner = () => {
    if (!window.selectedAthlete) {
        alert("Primero selecciona un atleta de la izquierda.");
        return;
    }
    window.bracketWinners.campeon = window.selectedAthlete;
    window.refreshAdvanceDestinations();
};
    

// PASO 3: Dibujar la columna derecha en el modal
window.refreshAdvanceDestinations = () => {
    const container = document.getElementById('advanceDestinations');
    if (!container) return;

    // 1. Definimos las rondas que queremos mostrar
    const rounds = [
        { id: 'round32', name: 'Ronda de 32 (16 Jugadores)', slots: 32 },
        { id: 'round16', name: 'Ronda de 16 (8 Jugadores)', slots: 16 },
        { id: 'round8', name: 'Cuartos de Final (4 Jugadores)', slots: 8 },
        { id: 'semi', name: 'Semifinales (2 Jugadores)', slots: 4 }
    ];

    // 2. Generamos el HTML de las rondas iniciales
    let html = rounds.map(r => `
        <div class="mb-6">
            <h5 class="text-[10px] text-cyan-400 font-black mb-3 uppercase tracking-tighter border-b border-cyan-900/30 pb-1">
                ${r.name}
            </h5>
            <div class="grid grid-cols-2 gap-2">
                ${window.bracketWinners[r.id].map((atleta, i) => `
                    <button onclick="window.assignToSlot('${r.id}', ${i})" 
                            class="text-left p-2 rounded text-[9px] border transition-all h-9 truncate
                            ${atleta ? 'bg-purple-600 border-purple-400 text-white font-bold shadow-lg shadow-purple-900/20' : 'bg-slate-950 border-slate-800 text-slate-600 hover:border-slate-500'}">
                        <span class="opacity-30 mr-1">${i + 1}.</span> ${atleta || '--- VACÍO ---'}
                    </button>
                `).join('')}
            </div>
        </div>
    `).join('');

    // 3. AQUÍ ES DONDE PONES EL BLOQUE DEL GANADOR (Justo antes del innerHTML)
    html += `
        <div class="mb-6">
            <h5 class="text-[10px] text-yellow-400 font-black mb-3 uppercase tracking-tighter border-b border-yellow-900/30 pb-1">
                FINAL (GANADOR)
            </h5>
            <button onclick="window.assignToWinner()" 
                    class="w-full text-center p-3 rounded text-[11px] border transition-all h-12 truncate
                    ${window.bracketWinners.campeon ? 'bg-yellow-600 border-yellow-400 text-white font-black' : 'bg-slate-950 border-slate-800 text-slate-600'}">
                🏆 ${window.bracketWinners.campeon || 'ASIGNAR CAMPEÓN'}
            </button>
        </div>
    `;

    // 4. Finalmente inyectamos todo el HTML construido al contenedor
    container.innerHTML = html;
};

        function generarEstructuraEliminacion(atletas) {
    // 1. Ordenamos por puntos de esgrima (de mayor a menor)
    const clasificados = [...atletas].sort((a, b) => b.puntosEsgrima - a.puntosEsgrima);
    
    const brackets = [];
    const n = clasificados.length;
    const numParejas = Math.ceil(n / 2);

    for (let i = 0; i < numParejas; i++) {
        const primero = clasificados[i];
        const ultimo = clasificados[n - 1 - i];

        // Si es el mismo atleta (número impar), el último es un "BYE"
        if (primero === ultimo) {
            brackets.push({ p1: primero.name, p2: "BYE / PASA DIRECTO" });
        } else {
            brackets.push({ p1: primero.name, p2: ultimo.name });
        }
    }
    return brackets;
}

    // --- FUNCIÓN PARA CARGAR ATLETAS EN EL SELECTOR ---
function loadAtletasToSelector() {
    const selector = document.getElementById('atletaSelector');
    if (!selector) return;

    // Limpiar selector
    selector.innerHTML = '<option value="">Seleccionar Atleta...</option>';

    // Usar la lista de atletas global (ajusta el nombre si usas otra variable)
    const atletasLocal = window.atletas || [];
    
    atletasLocal.forEach(atleta => {
        const option = document.createElement('option');
        option.value = atleta.id;
        option.textContent = atleta.nombre.toUpperCase();
        selector.appendChild(option);
    });
}

        function setupListeners() {
            loadAtletasToSelector();
            onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'athletes'), (snap) => {
                players = snap.docs.map(d => ({ id: d.id, ...d.data() }));

                updateAtletaSelector(players);

                renderAdminAtletas();
                document.getElementById('loadingOverlay').style.display = 'none';
                document.getElementById('app').classList.replace('opacity-0', 'opacity-100');
            });
            onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'events'), (snap) => {
                events = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => new Date(a.date) - new Date(b.date)); 
                updateEventSelect(); renderEventsList(); renderAdminEvents();
            });
            onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'disciplinas'), (snap) => {
                discData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                renderDisciplinas();
            });
        }

        window.toggleAccordion = (id) => {
            const content = document.getElementById('acc-' + id);
            content.classList.toggle('accordion-open');
        };

        // Variable global para almacenar los detalles del filtro actual
let currentFiltersText = "";

   window.applyFilters = (eventName, eventId) => {
    // 1. Guardar el nombre del evento seleccionado
    currentEventTitle = eventName;

    // 2. Obtener los textos de los selectores
    const discipline = document.getElementById('disc-'+eventId).value;
    const sex = document.getElementById('sex-'+eventId).options[document.getElementById('sex-'+eventId).selectedIndex].text;
    const cat = document.getElementById('cat-'+eventId).value;
    
    // --- CAMBIO AQUÍ: Limpiamos el número de la fase ---
    let phaseRaw = document.getElementById('phase-'+eventId).options[document.getElementById('phase-'+eventId).selectedIndex].text;
    // .replace(/^\d+\.\s*/, '') quita números y puntos al inicio del texto
    const phase = phaseRaw.replace(/^\d+\.\s*/, '').toUpperCase(); 
    
    const group = document.getElementById('group-'+eventId).value;

    // 3. Crear la línea de información de clasificación (Todo saldrá en Mayúsculas)
    currentFiltersInfo = `${discipline} | ${sex} | ${cat} | ${phase} | GRUPO ${group}`.toUpperCase();

    // 4. El resto del código se mantiene igual
    document.getElementById('publicEventsList').classList.add('hidden');
    document.getElementById('resultsContainer').classList.remove('hidden');
    
    // También limpiamos el título de la vista por si acaso
    document.getElementById('viewTitle').innerText = `${discipline} - ${cat} (${group})`.toUpperCase();

    if(discipline === "Pentatlon Moderno") {
        renderResults(eventName, document.getElementById('sex-'+eventId).value, document.getElementById('phase-'+eventId).value, cat, discipline, group);
        showSubView('ranking');
    } else {
        renderDisciplinas(discipline);
        showSubView('disciplinas');
    }
};

        window.showSubView = (view) => {
            document.querySelectorAll('.subview').forEach(v => v.classList.add('hidden'));
            document.getElementById(view + 'SubView').classList.remove('hidden');
            
            ['Rank', 'Stat', 'Handi', 'Tourney'].forEach(id => {
                const btn = document.getElementById('btn'+id);
                if(btn) btn.className = "bg-slate-800 text-slate-400 text-[9px] font-black uppercase px-4 py-2 rounded-lg";
            });

            const btnMap = {ranking: 'Rank', status: 'Stat', handicap: 'Handi', tournament: 'Tourney'};
            const activeBtn = document.getElementById('btn'+btnMap[view]);
            if(activeBtn) activeBtn.className = "bg-blue-600 text-white text-[9px] font-black uppercase px-4 py-2 rounded-lg";
        };

    window.saveDisciplina = async () => {
    const loader = document.getElementById('loadingOverlay');
    if(loader) loader.style.display = 'flex'; 

    try {
        const evento = document.getElementById('adminEventSelect')?.value; // Nuevo campo
        const atleta = document.getElementById('adminAtletaSelect')?.value;
        const final = document.getElementById('discTiempoFinal')?.value;

        if (!evento || !atleta || !final || atleta === "") {
            alert("⚠️ Debes seleccionar el Evento, el Atleta y tener un tiempo final.");
            if(loader) loader.style.display = 'none';
            return;
        }

        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'disciplinas'), {
            evento: evento, // <--- Se guarda el nombre del evento para filtrar
            nombre: atleta,
            estado: document.getElementById('adminEstado').value,
            genero: document.getElementById('adminGenero').value,
            categoria: document.getElementById('adminCategoria').value,
            fase: document.getElementById('adminFase').value,
            grupo: document.getElementById('adminGrupo').value,
            disciplina: document.getElementById('adminDisciplina').value,
            tiempoInicial: document.getElementById('discTiempoInicial').value,
            penalidadPts: document.getElementById('discPenalidad').value,
            tiempoFinal: final,
            timestamp: Date.now()
        });

        alert("✅ Registro guardado con éxito");
        document.getElementById('discTiempoInicial').value = "";
        document.getElementById('discTiempoFinal').value = "";

    } catch (error) {
        console.error("Error al guardar:", error);
        alert("❌ Error: " + error.message);
    } finally {
        if(loader) loader.style.display = 'none';
    }
};

        function calculatePenaltyAddition(penaltyPoints) {
            let penaltySeconds = (parseInt(penaltyPoints) || 0) * 25;
            let m = Math.floor(penaltySeconds / 60);
            let s = penaltySeconds % 60;
            return `${m}:${s < 10 ? '0' : ''}${s}`;
        }

       function renderDisciplinas(filterName = null) {
    let filtered = discData;
    if (currentEventTitle) {
        filtered = filtered.filter(d => d.evento === currentEventTitle);
    }
    if (filterName) {
        filtered = filtered.filter(d => d.disciplina === filterName);
    }

    // --- MODIFICACIÓN: Ordenar de menor a mayor tiempo final ---
    filtered.sort((a, b) => {
        const timeToSeconds = (timeStr) => {
            if (!timeStr || timeStr === '--' || !timeStr.includes(':')) return 999999;
            const [min, sec] = timeStr.split(':');
            return (parseFloat(min) * 60) + parseFloat(sec);
        };
        return timeToSeconds(a.tiempoFinal) - timeToSeconds(b.tiempoFinal);
    });
    // ----------------------------------------------------------

    const isOCR = filterName && filterName.startsWith("OCR");

    // ENCABEZADO DE LA TABLA
    document.getElementById('disciplinasHeader').innerHTML = `
        <tr>
            <th class="p-4">Nombre</th>
            <th class="p-4">Estado</th>
            ${!isOCR ? '<th class="p-4">Tiempo Inicial</th>' : ''}
            ${!isOCR ? '<th class="p-4 text-center">Penalidad</th>' : ''}
            <th class="p-4">Tiempo Final</th>
        </tr>
    `;

    // CUERPO DE LA TABLA
    document.getElementById('disciplinasBody').innerHTML = filtered.map(d => {
        const addedTime = calculatePenaltyAddition(d.penalidadPts);
        
        return `
            <tr>
                <td class="p-4 font-black uppercase">${d.nombre}</td>
                <td class="p-4 uppercase text-[10px]">${d.estado || '--'}</td>
                <td class="p-4 font-mono text-slate-400">${d.tiempoInicial || '--'}</td>
                
                <td class="p-4 text-center font-bold text-red-400">
                    ${d.penalidadPts || 0} Pts<br>
                    <span class="text-[8px] text-red-500/70">+${addedTime}</span>
                </td>

                <td class="p-4 font-mono text-white font-bold bg-orange-950/20">
                    ${d.tiempoFinal || '--'}<br>
                    <span class="text-[8px] text-orange-500/70">+${addedTime}</span>
                </td>
            </tr>
        `;
    }).join('');
    
    // Actualización de la lista de administración
    document.getElementById('adminDiscList').innerHTML = filtered.map(d => `
        <div class="flex justify-between items-center bg-slate-900 p-2 rounded-lg border border-slate-800">
            <span class="text-[10px] font-bold uppercase">${d.nombre} - ${d.disciplina}</span>
            <div class="flex gap-3">
                <button onclick="deleteDisc('${d.id}')" class="text-red-500 font-black text-[9px] uppercase">Eliminar</button>
            </div>
        </div>
    `).join('');
}

window.updateBracketControls = () => {
    const container = document.getElementById('adminBracketControls');
    if (!container || !window.tournamentRounds) return;

    container.innerHTML = ""; // Limpiar

    window.tournamentRounds.forEach((round, roundIndex) => {
        const roundDiv = document.createElement('div');
        roundDiv.className = "border-l-2 border-slate-600 pl-3 mb-4";
        roundDiv.innerHTML = `<h4 class="text-[10px] text-slate-500 font-bold mb-2 uppercase">Ronda ${roundIndex + 1}</h4>`;

        for (let i = 0; i < round.length; i += 2) {
            const p1 = round[i];
            const p2 = round[i+1] || { name: "BYE", isBye: true };
            
            if (p1.name === "BYE" && p2.isBye) continue;

            const matchRow = document.createElement('div');
            matchRow.className = "flex items-center gap-2 mb-2";
            matchRow.innerHTML = `
                <button onclick="advancePlayer(${roundIndex}, '${p1.name}')" class="bg-slate-700 hover:bg-green-600 text-white text-[10px] py-1 px-2 rounded transition-all">
                    ${p1.name} 🏆
                </button>
                <span class="text-slate-500 text-[10px]">vs</span>
                <button onclick="${p2.isBye ? '' : `advancePlayer(${roundIndex}, '${p2.name}')`}" 
                        class="${p2.isBye ? 'opacity-30 cursor-not-allowed' : 'bg-slate-700 hover:bg-green-600'} text-white text-[10px] py-1 px-2 rounded transition-all">
                    ${p2.name} ${p2.isBye ? '' : '🏆'}
                </button>
            `;
            roundDiv.appendChild(matchRow);
        }
        container.appendChild(roundDiv);
    });
};

        window.deleteDisc = async (id) => { if(confirm("¿Eliminar registro?")) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'disciplinas', id)); };

        function parseTime(val) {
            if (!val) return 0;
            let clean = val.toString().trim().replace(',', '.');
            if (clean.includes(':')) { const parts = clean.split(':'); return (parseFloat(parts[0]) || 0) * 60 + (parseFloat(parts[1]) || 0); }
            return parseFloat(clean) || 0;
        }


  function renderResults(eventName, sex, phase, category, discipline, group) {
    try {
// 1. Filtrado de atletas (se mantiene igual)
        const filteredPlayers = players.filter(p => 
            p.event === eventName && p.sex === sex && p.phase === phase && 
            p.category === category && p.group === group
        );

        console.log("Atletas para renderizar:", filteredPlayers.length);

        // 2. NUEVA LÓGICA: Sorteo previo por victorias de esgrima (para ranking)
        // Esto pone al que más ganó en la posición 1
        const sortedByFencing = [...filteredPlayers].sort((a, b) => {
            return (parseInt(b.esgrimaV) || 0) - (parseInt(a.esgrimaV) || 0);
        });

        // 3. Procesar cálculos usando el ranking fijo
        const data = sortedByFencing.map((p, index) => {
            
            // --- NUEVA LÓGICA ESGRIMA (Tabla Fija de Imagen) ---
            const posicion = index + 1; // index 0 es posición 1
            const wins = parseInt(p.esgrimaV) || 0;
            
            let esgrimaPts = 0;
            if (wins > 0) {
         
                esgrimaPts = UipmPoints[posicion] || Math.max(0, 152 - ((posicion - 40) * 2));
            }

            // --- EL RESTO DE TUS CÁLCULOS (Se mantienen igual) ---
            const tObs = parseTime(p.obstaculos);
            const obsPts = tObs > 0 ? Math.max(0, 400 - Math.floor((tObs - 15) / 0.33)) : 0;

            const tNat = parseTime(p.natacion);
            const natPts = tNat > 0 
                ? (p.category === "U19" ? Math.max(0, 250 - (tNat - 45) * 2) : Math.max(0, 375 - Math.ceil((tNat - 45) / 0.2)))
                : 0;

            const tLas = parseTime(p.laser);
            let lasPts = 0;
            if (tLas > 0) {
                lasPts = (p.category === "U19") 
                    ? Math.max(0, 700 - (tLas - 260)) 
                    : Math.max(0, 700 - Math.floor(tLas - 600));
            }

            const hPts = esgrimaPts + obsPts + natPts;
            const total = Math.round(hPts + lasPts);

            return { ...p, esgrimaPts, obsPts, natPts, lasPts, hPts, total };
        }).sort((a, b) => b.total - a.total); // Finalmente ordenamos la tabla general por TOTAL


        // --- RENDERIZADO DE TABLA PRINCIPAL ---
        const scoreboardBody = document.getElementById('scoreboardBody');
        if (scoreboardBody) {
            scoreboardBody.innerHTML = data.map(p => `
                <tr class="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                    <td class="p-4 font-black uppercase">
                        ${p.name}<br>
                        <span class="text-[9px] text-blue-400/80 font-medium">
                            ${p.estado || 'S/E'} | ${p.category} | GRP ${p.group || 'A'}
                        </span>
                    </td>
                    <td class="p-4 text-center">
                        <span class="pts-value text-blue-300 font-bold">${p.esgrimaPts}</span>
                    </td>
                    <td class="p-4 text-center">
                        <span class="pts-value font-bold text-slate-200">${p.obsPts}</span><br>
                        <span class="text-[9px] text-slate-500 font-mono">${p.obstaculos || '--:--'}</span>
                    </td>
                    <td class="p-4 text-center">
                        <span class="pts-value font-bold text-slate-200">${p.natPts}</span><br>
                        <span class="text-[9px] text-slate-500 font-mono">${p.natacion || '--:--'}</span>
                    </td>
                    <td class="p-4 text-center">
                        <span class="pts-value font-bold text-slate-200">${p.lasPts}</span><br>
                        <span class="text-[9px] text-slate-500 font-mono">${p.laser || '--:--'}</span>
                    </td>
                    <td class="p-4 text-center font-black text-blue-400 text-lg">
                        ${p.total}
                    </td>
                </tr>
            `).join('');
        }

        // --- STATUS GRID ---
       const statusGrid = document.getElementById('statusGrid');
if (statusGrid) {
    // Creamos una copia de 'data' y la ordenamos por victorias (esgrimaV) de mayor a menor
    const sortedByWins = [...data].sort((a, b) => {
        return (parseInt(b.esgrimaV) || 0) - (parseInt(a.esgrimaV) || 0);
    });

    statusGrid.innerHTML = sortedByWins.map(p => `
        <div class="card p-4 rounded-xl text-center bg-slate-900/50 border border-slate-800">
            <p class="text-[10px] font-black uppercase mb-2 text-white">${p.name}</p>
            <div class="grid grid-cols-2 gap-2">
                <div class="bg-green-900/20 p-2 rounded text-green-400 font-bold">
                    ${p.esgrimaV || 0}V
                </div>
                <div class="bg-red-900/20 p-2 rounded text-red-400 font-bold">
                    ${p.esgrimaD || 0}D
                </div>
            </div>
        </div>
    `).join('');
}

const sortedForBracket = [...data].sort((a, b) => (parseInt(b.esgrimaV) || 0) - (parseInt(a.esgrimaV) || 0));

// Llenamos el objeto que usa la función downloadBracketPDF
window.bracketWinners = {
    round16: sortedForBracket.map(p => p.name), // Metemos a todos los atletas aquí
    round8: [], // Se llenarán manualmente o por lógica de avance
    semi: [],
    campeon: null
};
        
// --- ELIMINACIÓN DIRECTA DINÁMICA ---
// --- DENTRO DE TU FUNCIÓN PRINCIPAL renderResults ---
const tournamentBrackets = document.getElementById('tournamentBrackets');
if (tournamentBrackets) {
    tournamentBrackets.innerHTML = "";
    
    if (!window.tournamentRounds || window.tournamentRounds.length === 0) {
        window.tournamentRounds = [ [...data] ];
    }


    


    window.tournamentRounds.forEach((roundPlayers, roundIndex) => {
        const roundColumn = document.createElement('div');
        roundColumn.className = "flex flex-col gap-12 min-w-[220px]";
        roundColumn.innerHTML = `<h3 class="text-slate-500 text-[10px] font-black text-center mb-2">RONDA ${roundIndex + 1}</h3>`;

        for (let i = 0; i < roundPlayers.length; i += 2) {
            const p1 = roundPlayers[i];
            const p2 = roundPlayers[i + 1] || { name: "BYE", isBye: true };

            const pairDiv = document.createElement('div');
            pairDiv.className = "relative border border-slate-700 bg-slate-900/60 shadow-lg";
            pairDiv.innerHTML = `
                <div class="p-3 border-b border-slate-700 flex justify-between">
                    <span class="text-[11px] font-bold text-white uppercase">${p1.name}</span>
                </div>
                <div class="p-3 flex justify-between">
                    <span class="text-[11px] font-bold text-white uppercase">${p2.name}</span>
                </div>
                ${roundPlayers.length > 1 ? `
                <div class="absolute -right-8 top-1/2 -translate-y-1/2 flex items-center">
                    <div class="w-8 h-px bg-slate-600"></div>
                    <div class="w-px h-16 bg-slate-600"></div>
                </div>` : ''}
            `;
            roundColumn.appendChild(pairDiv);
        }
        tournamentBrackets.appendChild(roundColumn);
    });

    // IMPORTANTE: Cada vez que renderizamos brackets, actualizamos el panel admin por si está abierto
    updateBracketControls();
}

        // --- HÁNDICAP ---
        const handicapBody = document.getElementById('handicapBody');
        if (handicapBody) {
            const hData = [...data].sort((a,b) => b.hPts - a.hPts); 
            const best = hData[0]?.hPts || 0;
            handicapBody.innerHTML = hData.map((p, i) => `
                <tr>
                    <td class="p-4 font-black uppercase">${p.name}</td>
                    <td class="p-4 pts-value">${p.hPts}</td>
                    <td class="p-4 text-green-500 font-mono">${i === 0 ? '0' : `+${best - p.hPts}s`}</td>
                </tr>
            `).join('');
        }

        document.getElementById('loadingOverlay').style.display = 'none';

    } catch (error) {
        console.error("Error en renderResults:", error);
        document.getElementById('loadingOverlay').style.display = 'none';
    }

     const hData = [...data].sort((a,b) => b.hPts - a.hPts); 
            const best = hData[0]?.hPts || 0;
            document.getElementById('handicapBody').innerHTML = hData.map((p, i) => `<tr><td class="p-4 font-black uppercase">${p.name}</td><td class="p-4 pts-value">${p.hPts}</td><td class="p-4 text-green-500 font-mono">${i === 0 ? '0' : `+${best - p.hPts}s`}</td></tr>`).join('');
        
}

window.advancePlayer = (roundIndex, winnerName) => {
    if (!confirm(`¿Confirmar que ${winnerName} avanza?`)) return;

    if (!window.tournamentRounds[roundIndex + 1]) window.tournamentRounds[roundIndex + 1] = [];
    
    const nextRound = window.tournamentRounds[roundIndex + 1];
    if (!nextRound.some(p => p.name === winnerName)) {
        nextRound.push({ name: winnerName });
        
        // Refrescar todo
        renderResults(window.currentDataGlobal || []);
        updateBracketControls(); 
    }
};

window.resetBrackets = () => {
    if (confirm("¿Seguro que quieres borrar todo el progreso del torneo?")) {
        window.tournamentRounds = [];
        renderResults(window.currentDataGlobal || []);
        updateBracketControls();
    }
};

        window.toggleAdminMode = () => { if (isAdmin) { logoutAdmin(); } else { openLoginModal(); } };
        function logoutAdmin() {
            isAdmin = false;
            document.getElementById('adminPanel').classList.add('hidden');
            document.getElementById('adminBadge').classList.add('hidden');
            document.getElementById('adminToggleBtn').innerText = "Admin";
        }

        window.saveEvent = async () => {
            const name = document.getElementById('eventName').value;
            if(!name) return;
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'events', crypto.randomUUID()), { name, date: document.getElementById('eventDate').value, location: document.getElementById('eventDesc').value });
            alert("Evento Guardado");
        };

       window.savePlayer = async () => {
    const editId = document.getElementById('editPlayerId').value;
    
    // Capturamos los datos, incluyendo el nuevo campo 'estado'
    const data = {
        event: document.getElementById('playerEvent').value, 
        name: document.getElementById('playerName').value,
        estado: document.getElementById('playerEstado').value, // <-- NUEVA LÍNEA
        sex: document.getElementById('playerSex').value, 
        category: document.getElementById('playerCategory').value,
        group: document.getElementById('playerGroup').value,
        phase: document.getElementById('playerPhase').value, 
        esgrimaV: document.getElementById('playerEsgrimaV').value,
        esgrimaD: document.getElementById('playerEsgrimaD').value, 
        esgrimaTotal: document.getElementById('playerEsgrimaTotal').value,
        obstaculos: document.getElementById('playerObstaculos').value, 
        natacion: document.getElementById('playerNatacion').value,
        laser: document.getElementById('playerLaser').value
    };

    if(!data.name) return alert("Ingrese nombre");
    
    // Si no seleccionan estado, podrías dar un aviso o dejarlo opcional
    if(!data.estado) return alert("Seleccione un Estado");

    const finalId = editId || crypto.randomUUID();
    
    try {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'athletes', finalId), data);
        alert(editId ? "Atleta Actualizado" : "Atleta Guardado");
        cancelEditPlayer(); // Esto limpiará todos los campos
    } catch (error) {
        console.error("Error al guardar:", error);
        alert("Error al guardar el atleta");
    }
};
// IMPORTANTE: Llama a la función dentro de start() o setupListeners()

        window.editPlayer = (id) => {
            const p = players.find(x => x.id === id);
            if(!p) return;
            document.getElementById('atletaFormTitle').innerText = "Editando Atleta";
            document.getElementById('editPlayerId').value = p.id;
            document.getElementById('playerEvent').value = p.event;
            document.getElementById('playerName').value = p.name;
            document.getElementById('playerSex').value = p.sex;
            document.getElementById('playerCategory').value = p.category;
            document.getElementById('playerGroup').value = p.group || "A";
            document.getElementById('playerPhase').value = p.phase;
            document.getElementById('playerEsgrimaV').value = p.esgrimaV;
            document.getElementById('playerEsgrimaD').value = p.esgrimaD;
            document.getElementById('playerEsgrimaTotal').value = p.esgrimaTotal;
            document.getElementById('playerObstaculos').value = p.obstaculos;
            document.getElementById('playerNatacion').value = p.natacion;
            document.getElementById('playerLaser').value = p.laser;
            document.getElementById('savePlayerBtn').innerText = "Actualizar Atleta";
            document.getElementById('cancelEditBtn').classList.remove('hidden');
            window.scrollTo({ top: document.getElementById('atletaFormTitle').offsetTop - 20, behavior: 'smooth' });
        };

        window.cancelEditPlayer = () => {
            document.getElementById('atletaFormTitle').innerText = "Registrar Atleta";
            document.getElementById('editPlayerId').value = "";
            document.getElementById('playerName').value = "";
            document.getElementById('playerEstado').value = ""; // <-- ESTA ES LA NUEVA LÍNEA
            document.getElementById('playerEsgrimaV').value = "";
            document.getElementById('playerEsgrimaD').value = "";
            document.getElementById('playerEsgrimaTotal').value = "";
            document.getElementById('playerObstaculos').value = "";
            document.getElementById('playerNatacion').value = "";
            document.getElementById('playerLaser').value = "";
            document.getElementById('savePlayerBtn').innerText = "Guardar Atleta";
            document.getElementById('cancelEditBtn').classList.add('hidden');
        };

        window.deletePlayer = async (id) => { if(confirm("¿Eliminar Atleta permanentemente?")) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'athletes', id)); };

       function renderAdminAtletas() {
    document.getElementById('adminAtletasList').innerHTML = players.map(p => `
        <div class="atleta-item flex justify-between items-center bg-slate-900 p-3 rounded-xl border border-slate-800 mb-2">
            <div>
                <p class="text-[10px] font-black uppercase text-white">${p.name}</p>
                <p class="text-[8px] text-slate-500 uppercase">${p.category} | GRP ${p.group || 'A'} | ${p.event}</p>
            </div>
            <div class="flex gap-2">
                <button onclick="editPlayer('${p.id}')" class="text-blue-500 font-black text-[9px] uppercase">Editar</button>
                <button onclick="deletePlayer('${p.id}')" class="text-red-500 font-black text-[9px] uppercase">Eliminar</button>
            </div>
        </div>
    `).join('');
}

        // Función para llenar el selector de atletas en el panel de pruebas
window.updateAtletaSelector = (atletas) => {
    const select = document.getElementById('adminAtletaSelect');
    if (!select) return;
    
    // Guardamos el valor que estaba seleccionado para no perderlo al actualizar
    const currentSelection = select.value;
    
    select.innerHTML = '<option value="">Seleccionar Atleta Registrado</option>';
    
    // Ordenamos alfabéticamente para que sea fácil de encontrar
    const ordenados = [...atletas].sort((a, b) => a.name.localeCompare(b.name));

    ordenados.forEach(atleta => {
        const option = document.createElement('option');
        // Usamos .name porque así lo guardas en savePlayer
        option.value = atleta.name; 
        option.textContent = atleta.name.toUpperCase();
        select.appendChild(option);
    });

    // Restauramos la selección si aún existe
    select.value = currentSelection;
};

        function renderEventsList() { 
            document.getElementById('publicEventsList').innerHTML = events.map(e => `
                <div class="card rounded-2xl overflow-hidden shadow-2xl">
                    <div onclick="toggleAccordion('${e.id}')" class="p-6 flex justify-between items-center cursor-pointer hover:bg-slate-800/40">
                        <div><p class="text-xs font-black text-white uppercase tracking-tighter">${e.name}</p><p class="text-[9px] text-blue-400 font-bold uppercase mt-1">${e.location} • ${e.date}</p></div>
                        <div class="bg-slate-800 p-2 rounded-lg text-blue-500">▼</div>
                    </div>
                    <div id="acc-${e.id}" class="accordion-content bg-slate-900/20 px-6">
                        <div class="py-6 border-t border-slate-800/50 space-y-4">
                            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                                <div><label class="text-[9px] uppercase font-black text-orange-500 ml-1">Prueba</label>
                                <select id="disc-${e.id}" class="input-dark w-full p-3 rounded-xl mt-1 text-xs border-orange-500/50">
                                    <option value="Pentatlon Moderno">Pentatlon Moderno</option>
                                    <option value="Obstaculos Laser Run">Obstaculos Laser Run</option>
                                    <option value="OCR 100">OCR 100</option>
                                    <option value="OCR 400">OCR 400</option>
                                    <option value="OCR 3 Km+">OCR 3 Km+</option>
                                </select></div>
                                <div><label class="text-[9px] uppercase font-black text-slate-500 ml-1">Género</label><select id="sex-${e.id}" class="input-dark w-full p-3 rounded-xl mt-1 text-xs"><option value="M">HOMBRE</option><option value="F">MUJER</option><option value="TODOS">RELEVOS</option></select></div>
                                <div><label class="text-[9px] uppercase font-black text-slate-500 ml-1">Categoría</label>
                                <select id="cat-${e.id}" class="input-dark w-full p-3 rounded-xl mt-1 text-xs">
                                    <option value="U09">U09</option><option value="U11">U11</option><option value="U13">U13</option><option value="U15">U15</option>
                                    <option value="U17">U17</option><option value="U19">U19</option><option value="Junior">Junior</option><option value="Senior">Senior</option>
                                    <option value="JDN 2026">JDN 2026</option>
                                </select></div>
                                <div><label class="text-[9px] uppercase font-black text-slate-500 ml-1">Fase</label>
                                <select id="phase-${e.id}" class="input-dark w-full p-3 rounded-xl mt-1 text-xs">
                                    <option value="Clasificación">1. CLASIFICACIÓN</option>
                                    <option value="Semifinal">2. SEMIFINAL</option>
                                    <option value="Final">3. FINAL</option>
                                </select></div>
                                <div><label class="text-[9px] uppercase font-black text-slate-500 ml-1">Grupo</label>
                                <select id="group-${e.id}" class="input-dark w-full p-3 rounded-xl mt-1 text-xs">
                                    <option value="A">GRUPO A</option>
                                    <option value="B">GRUPO B</option>
                                    <option value="C">GRUPO C</option>
                                </select></div>
                            </div>
                            <button onclick="applyFilters('${e.name}', '${e.id}')" class="btn-primary w-full py-4 rounded-2xl text-xs font-black uppercase">Ver Resultados</button>
                        </div>
                    </div>
                </div>
            `).join(''); 
        }

        window.deleteEvent = async (id) => { if(confirm("¿Eliminar?")) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'events', id)); };
        function updateEventSelect() { 
    const options = events.map(e => `<option value="${e.name}">${e.name}</option>`).join('');
    document.getElementById('playerEvent').innerHTML = options;
    
    // Agrega esta línea para que también llene el selector de las pruebas
    const adminEvSel = document.getElementById('adminEventSelect');
    if(adminEvSel) adminEvSel.innerHTML = '<option value="">Seleccionar Evento</option>' + options;
}
        function renderAdminEvents() { document.getElementById('adminEventsList').innerHTML = events.map(e => `<div class="flex justify-between items-center bg-slate-900 p-2 rounded-lg border border-slate-800"><span class="text-[10px] font-bold uppercase">${e.name}</span><button onclick="deleteEvent('${e.id}')" class="text-red-500 font-black">ELIMINAR</button></div>`).join(''); }

        window.openLoginModal = () => document.getElementById('loginModal').classList.remove('hidden');
        window.closeLoginModal = () => document.getElementById('loginModal').classList.add('hidden');
        window.checkPassword = () => { 
            if (document.getElementById('adminPass').value === "Newman.999") { 
                isAdmin = true; 
                document.getElementById('adminPanel').classList.remove('hidden'); 
                document.getElementById('adminBadge').classList.remove('hidden');
                document.getElementById('adminToggleBtn').innerText = "Usuario Normal";
                closeLoginModal(); 
            } else { alert("Error"); }
        };
        start();


      // --- CONFIGURACIÓN GLOBAL DE PDF ---
const PDF_CONFIG = {
    logoPath: 'deeee.jpeg',
    colors: {
        primary: [15, 23, 42],   // Slate 900
        secondary: [71, 85, 105], // Slate 600
        accent: [22, 163, 74],    // Green 600
        border: [203, 213, 225]   // Slate 300
    }
};

// --- FUNCIÓN PRIVADA: GENERA EL ENCABEZADO ---
async function _prepararPagina(doc, subtitulo) {
    const width = doc.internal.pageSize.getWidth();
    
    const cargarLogo = () => new Promise(resolve => {
        const img = new Image();
        img.src = PDF_CONFIG.logoPath;
        img.onload = () => {
            doc.addImage(img, 'JPEG', 40, 20, 45, 45);
            resolve();
        };
        img.onerror = () => {
            console.warn("Logo no encontrado, continuando...");
            resolve();
        };
    });

    await cargarLogo();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...PDF_CONFIG.colors.primary);
    const tituloEvento = (typeof window.currentEventTitle !== 'undefined' && window.currentEventTitle) 
        ? window.currentEventTitle.toUpperCase() 
        : "PENTA ELITE SYSTEM";
    doc.text(tituloEvento, 95, 42);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...PDF_CONFIG.colors.secondary);
    doc.text(subtitulo.toUpperCase(), 95, 55);

    doc.setDrawColor(...PDF_CONFIG.colors.border);
    doc.line(40, 75, width - 40, 75);
}

// --- DESCARGA: RANKING GENERAL ---
window.downloadGeneralPDF = async () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'pt', 'a4');
    await _prepararPagina(doc, "Clasificación General del Evento");

    const body = [];
    document.querySelectorAll("#scoreboardBody tr").forEach(tr => {
        const c = tr.querySelectorAll("td");
        if(c.length >= 6) {
            body.push([
                c[0].innerText.split('\n')[0].trim().toUpperCase(),
                c[1].innerText.trim(), 
                c[2].innerText.split('\n')[0].trim(),
                c[3].innerText.split('\n')[0].trim(),
                c[4].innerText.split('\n')[0].trim(),
                c[5].innerText.trim()
            ]);
        }
    });

    doc.autoTable({
        startY: 90,
        head: [['ATLETA', 'ESG', 'OBS', 'NAT', 'LASER', 'TOTAL']],
        body: body,
        theme: 'striped',
        headStyles: { fillColor: PDF_CONFIG.colors.primary, halign: 'center' },
        styles: { fontSize: 9, halign: 'center' },
        columnStyles: { 0: { halign: 'left', fontStyle: 'bold' } }
    });
    doc.save("Ranking_General.pdf");
};

// --- DESCARGA: LLAVES / BRACKETS (VISUAL) ---
window.downloadBracketPDF = async () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'pt', 'a4'); // Horizontal para las llaves
    await _prepararPagina(doc, "Diagrama de Eliminación Directa - Esgrima");

    const bw = window.bracketWinners || {};
    const drawCard = (x, y, name, highlight = false) => {
        doc.setFillColor(...(highlight ? [30, 58, 138] : PDF_CONFIG.colors.primary));
        doc.rect(x, y, 110, 18, 'F');
        doc.setTextColor(255);
        doc.setFontSize(7);
        doc.text(name ? name.toUpperCase().substring(0, 20) : "---", x + 5, y + 12);
    };

    const drawLine = (x1, y1, x2, y2) => {
        doc.setDrawColor(150);
        doc.setLineWidth(0.5);
        doc.line(x1, y1, x2, y2);
    };

    // Coordenadas iniciales
    let x = 40;
    let y = 100;
    let r16Y = [];

    // Ronda de 16 (Columna 1)
    if (bw.round16) {
        for(let i = 0; i < 8; i++) {
            let yA = y + (i * 45);
            let yB = yA + 20;
            drawCard(x, yA, bw.round16[i*2]);
            drawCard(x, yB, bw.round16[i*2+1]);
            let mid = yA + 19;
            r16Y.push(mid);
            drawLine(x + 110, mid, x + 130, mid);
        }
    }

    // Ronda de 8 (Columna 2)
    x += 140;
    let r8Y = [];
    for(let i = 0; i < 4; i++) {
        let mid = (r16Y[i*2] + r16Y[i*2+1]) / 2;
        drawCard(x, mid - 9, bw.round8 ? bw.round8[i] : "");
        r8Y.push(mid);
        drawLine(x - 10, r16Y[i*2], x - 10, r16Y[i*2+1]); // Línea vertical conectora
        drawLine(x - 10, mid, x, mid); // Línea horizontal
        drawLine(x + 110, mid, x + 130, mid);
    }

    // Semifinal (Columna 3)
    x += 140;
    let sfY = [];
    for(let i = 0; i < 2; i++) {
        let mid = (r8Y[i*2] + r8Y[i*2+1]) / 2;
        drawCard(x, mid - 9, bw.semi ? bw.semi[i] : "");
        sfY.push(mid);
        drawLine(x - 10, r8Y[i*2], x - 10, r8Y[i*2+1]);
        drawLine(x - 10, mid, x, mid);
        drawLine(x + 110, mid, x + 130, mid);
    }

    // Final (Columna 4)
    x += 140;
    let finalMid = (sfY[0] + sfY[1]) / 2;
    drawCard(x, finalMid - 9, bw.campeon, true);
    drawLine(x - 10, sfY[0], x - 10, sfY[1]);
    drawLine(x - 10, finalMid, x, finalMid);

    doc.save("Torneo_Llaves.pdf");
};

// --- DESCARGA: HÁNDICAP ---
window.downloadHandicapPDF = async () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'pt', 'a4');
    const tablaBody = document.getElementById('handicapBody');
    const filasHTML = tablaBody ? tablaBody.querySelectorAll("tr") : [];

    if (filasHTML.length === 0) {
        alert("⚠️ No hay datos en la tabla de Hándicap.");
        return;
    }

    await _prepararPagina(doc, "Orden de Salida: Laser Run (Hándicap)");

    const body = Array.from(filasHTML).map(tr => {
        const celdas = tr.querySelectorAll("td");
        return Array.from(celdas).map(td => td.innerText.trim().toUpperCase());
    }).filter(f => f.length >= 3);

    doc.autoTable({
        startY: 90,
        head: [['ATLETA', 'PUNTOS', 'SALIDA']],
        body: body,
        theme: 'striped',
        headStyles: { fillColor: PDF_CONFIG.colors.primary, halign: 'center' },
        styles: { halign: 'center', fontSize: 9 },
        columnStyles: { 0: { halign: 'left', fontStyle: 'bold' } }
    });
    doc.save("Salida_Handicap.pdf");
};

// --- EL CONTROLADOR DE VISTAS ---
window.ejecutarDescargaSegunVista = () => {
    const isRanking = !document.getElementById('rankingSubView').classList.contains('hidden');
    const isEsgrima = !document.getElementById('statusSubView').classList.contains('hidden');
    const isHandicap = !document.getElementById('handicapSubView').classList.contains('hidden');

    if (isEsgrima) {
        // Ejecutamos la función de las LLAVES que te gusta
        window.downloadBracketPDF(); 
    } 
    else if (isHandicap) {
        window.downloadHandicapPDF();
    }
    else if (isRanking) {
        window.downloadGeneralPDF();
    }
};

// --- 1. GESTIONAR LLAVES (ABRIR MODAL) ---
window.toggleBracketAdmin = () => {
    const modal = document.getElementById('adminBracketsModal');
    if (modal) {
        modal.classList.toggle('hidden');
        // Aquí podrías llamar a una función para refrescar los selectores si la tienes
    }
};

// --- 2. ASEGURAR AVANCE (MANEJO DEL MODAL DE AVANCE) ---
window.openAdvanceManager = () => {
    const modal = document.getElementById('advanceManagerModal');
    const listContainer = document.getElementById('advanceAtletasList');
    
    if (!modal || !listContainer) return;

    // Llenar lista izquierda con atletas de Firebase
    listContainer.innerHTML = players.map(p => `
        <div class="flex justify-between items-center bg-slate-800 p-2 rounded mb-2 border border-slate-700">
            <span class="text-[10px] font-bold text-white uppercase">${p.name}</span>
            <button onclick="window.prepareSelection('${p.name}', this)" 
                    class="btn-select-atleta bg-purple-600 text-[9px] px-2 py-1 rounded font-black uppercase">
                Seleccionar
            </button>
        </div>
    `).join('');

    // Pintar los slots de la derecha
    window.refreshAdvanceDestinations();

    modal.classList.remove('hidden');
};

window.closeAdvanceManager = () => {
    document.getElementById('advanceManagerModal').classList.add('hidden');
};


window.confirmarReinicioTorneo = () => {
    if (confirm("⚠️ ¿ESTÁS SEGURO? Esto borrará el progreso visual de las llaves y reiniciará el torneo.")) {
        // Reiniciamos las variables globales de las llaves
        window.tournamentRounds = [];
        window.bracketWinners = { round32:[], round16:[], round8:[], semi:[], campeon: null };
        
        // Refrescamos la vista
        if (typeof renderResults === 'function') {
            // Intentamos renderizar con los datos actuales para limpiar visualmente
            location.reload(); 
        }
        alert("Torneo reiniciado correctamente.");
    }
};

// Variable para saber si estamos en Login o Registro
window.currentMode = 'login';

// Función para cambiar entre pestañas (Login/Registro)
window.switchTab = (mode) => {
    window.currentMode = mode;
    const isLogin = mode === 'login';
    document.getElementById('tab-login').classList.toggle('active', isLogin);
    document.getElementById('tab-register').classList.toggle('active', !isLogin);
    document.getElementById('submitBtn').innerText = isLogin ? 'Entrar al Sistema' : 'Crear Cuenta Nueva';
};

// Lógica del Botón de Google
const googleBtn = document.getElementById('googleBtn');
if (googleBtn) {
    googleBtn.addEventListener('click', async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Error Google:", error);
            alert("Error al acceder con Google");
        }
    });
}

// Lógica del Formulario (Login y Registro)
const authForm = document.getElementById('authForm');
if (authForm) {
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        try {
            if (window.currentMode === 'register') {
                await createUserWithEmailAndPassword(auth, email, password);
                alert("Cuenta creada con éxito");
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
        } catch (error) {
            alert("Error: " + error.message);
        }
    });
}

window.parseTime = (val) => {
    if (!val) return 0;
    let clean = val.toString().trim().replace(',', '.');
    if (clean.includes(':')) {
        const parts = clean.split(':');
        return (parseFloat(parts[0]) || 0) * 60 + (parseFloat(parts[1]) || 0);
    }
    return parseFloat(clean) || 0;
};

// 2. Tu función para el formulario naranja
window.autoCalculateFinalTime = () => {
    const tIniRaw = document.getElementById('discTiempoInicial').value;
    const penPts = parseInt(document.getElementById('discPenalidad').value) || 0;
    const campoFinal = document.getElementById('discTiempoFinal');

    if (!campoFinal) return;

    // IMPORTANTE: Usamos window.parseTime para que no de error
    let totalSeconds = window.parseTime(tIniRaw);

    if (totalSeconds > 0) {
        totalSeconds += (penPts * 25);
        const mins = Math.floor(totalSeconds / 60);
        const secs = Math.floor(totalSeconds % 60);
        campoFinal.value = `${mins}:${secs.toString().padStart(2, '0')}`;
    } else {
        campoFinal.value = "";
    }
};

window.filterAtletasList = () => {
    const input = document.getElementById('atletaSearchInput');
    const filter = input ? input.value.toLowerCase() : "";
    const items = document.getElementsByClassName('atleta-item');

    Array.from(items).forEach(item => {
        const text = item.innerText.toLowerCase();
        // Usamos display flex para que no se rompa tu diseño original de las tarjetas
        if (text.includes(filter)) {
            item.style.display = "flex";
        } else {
            item.style.display = "none";
        }
    });
};