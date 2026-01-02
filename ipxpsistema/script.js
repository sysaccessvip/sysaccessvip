


import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getDatabase, ref, set, push, onValue, remove, update, get } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyCA1OooyOMG4zJCOUx5CXYrE6u8SOSI-dM",
    authDomain: "camino-de-santidad-sistema.firebaseapp.com",
    databaseURL: "https://camino-de-santidad-sistema-default-rtdb.firebaseio.com",
    projectId: "camino-de-santidad-sistema",
    storageBucket: "camino-de-santidad-sistema.firebasestorage.app",
    messagingSenderId: "30426286256",
    appId: "1:30426286256:web:3110d09b7057a92299d375"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);
const IMGBB_KEY = "b0858e38abd2cadfbd58996aeb52b341";
let IS_ADMIN = false; 

let CURRENT_YEAR = new Date().getFullYear().toString();
let CURRENT_MONTH = new Date().getMonth(); // Mes actual por defecto (0-11)
let CURRENT_PAGE = 'dashboard';
let ALL_MEMBERS_CACHE = [];

let idleTime = 0;
let idleInterval;
const TIME_LIMIT_SEC = 120; // 2 min
const WARNING_SEC = 5;

const Toast = Swal.mixin({
    toast: true, position: 'top-end', showConfirmButton: false,
    timer: 3000, timerProgressBar: true, iconColor: 'white',
    customClass: { popup: 'colored-toast' }
});

window.addEventListener('load', () => {
    setTimeout(() => { document.getElementById('splashScreen').style.opacity='0'; setTimeout(()=>document.getElementById('splashScreen').style.visibility='hidden', 800); }, 1500);
    ['mousemove','keypress','click','scroll'].forEach(evt => document.addEventListener(evt, resetTimer));
    startIdleTimer();
    // Setear el selector de mes al mes actual
    document.getElementById('monthSelector').value = CURRENT_MONTH;


// --- AGREGA ESTO AQUÍ ---
    // Detectar si hay un hash en la URL (ej: #diezmos) y cargar esa página
    const hash = window.location.hash.substring(1); // quita el símbolo #
    if(hash) {
        loadPage(hash);
    }
    // ------------------------

});

function startIdleTimer() {
    if(idleInterval) clearInterval(idleInterval);
    idleInterval = setInterval(() => {
        if(!IS_ADMIN) return;
        idleTime++;
        if(idleTime === (TIME_LIMIT_SEC - WARNING_SEC)) {
            Swal.fire({
                title: 'Inactividad', html: 'Cerrando sesión en <b></b> seg.',
                timer: WARNING_SEC * 1000, timerProgressBar: true, allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                    const b = Swal.getHtmlContainer().querySelector('b');
                    window.timerInterval = setInterval(() => b.textContent = Math.ceil(Swal.getTimerLeft()/1000), 100);
                },
                willClose: () => clearInterval(window.timerInterval)
            }).then((result) => { if (result.dismiss === Swal.DismissReason.timer) signOut(auth); });
        }
    }, 1000);
}

function resetTimer() {
    idleTime = 0;
    if(Swal.isVisible() && Swal.getTitle()?.textContent === 'Inactividad') Swal.close();
}

// Detectar cambio de sesión (Login/Logout)
onAuthStateChanged(auth, (user) => {
    const section = document.getElementById('authSection');
    
    if (user) {
        // 1. ¡ESTA ES LA SOLUCIÓN! Forzamos cerrar el login si detectamos usuario
        closeLogin(); 

        // 2. Configuración de Admin
        IS_ADMIN = true;
        section.innerHTML = `
            <div class="d-flex align-items-center mb-3 text-white-50">
                <div class="bg-primary rounded-circle p-2 me-2 text-white d-flex align-items-center justify-content-center" style="width:35px;height:35px">A</div>
                <small class="fw-bold">Admin Conectado</small>
            </div>
            <button onclick="doLogout()" class="btn btn-outline-danger btn-sm w-100 rounded-pill">Cerrar Sesión</button>
        `;
        document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('d-none'));
    } else {
        // 3. Configuración de Visitante
        IS_ADMIN = false;
        section.innerHTML = `<button onclick="openLogin()" class="btn btn-primary btn-sm w-100 rounded-pill shadow-sm">Acceso Admin</button>`;
        document.querySelectorAll('.admin-only').forEach(el => el.classList.add('d-none'));
        
        // Si se desconecta estando en una pantalla privada, lo mandamos al inicio
        if(CURRENT_PAGE === 'diezmos') loadPage('dashboard');
    }
    // Cargar la página actual con los nuevos permisos
    loadPage(CURRENT_PAGE);
});
window.openLogin = () => document.getElementById('loginOverlay').classList.add('active');
window.closeLogin = () => document.getElementById('loginOverlay').classList.remove('active');

window.doLogin = () => {
    const email = document.getElementById('logEmail').value;
    const pass = document.getElementById('logPass').value;
    const btn = document.getElementById('btnLoginBtn');
    const txt = document.getElementById('btnLoginText');
    const spin = document.getElementById('btnLoginSpinner');

    // 1. Mostrar estado de "Cargando..."
    btn.disabled = true; 
    txt.classList.add('d-none'); 
    spin.classList.remove('d-none'); 

    // 2. Intentar Login
    signInWithEmailAndPassword(auth, email, pass)
        .then(() => {
            // ÉXITO:
            closeLogin(); // Cerrar ventana inmediatamente
            document.getElementById('logPass').value = ''; // Borrar contraseña escrita
            Toast.fire({ icon: 'success', title: 'Bienvenido', background: '#10b981', color:'white' }); 
        })
        .catch((error) => {
            // ERROR:
            console.error(error);
            Toast.fire({ icon: 'error', title: 'Credenciales incorrectas', background: '#ef4444', color:'white' });
        })
        .finally(() => {
            // SIEMPRE: Restaurar el botón a la normalidad
            btn.disabled = false;
            txt.classList.remove('d-none');
            spin.classList.add('d-none');
        });
};

window.doLogout = () => signOut(auth);

// --- NAVEGACIÓN ---
window.loadPage = (page) => {
    CURRENT_PAGE = page;
    document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
    const link = document.querySelector(`.nav-link[data-page="${page}"]`);
    if(link) link.classList.add('active');
    
    document.getElementById('sidebar').classList.remove('active');
    document.querySelector('.overlay').classList.remove('active');
    
    const titles = { 'dashboard':'Panel General', 'diezmos':'Control de Diezmos', 'ofrendas':'Ofrendas', 'actividades':'Actividades', 'otros':'Otros Ingresos', 'pagos':'Gastos' };
    document.getElementById('pageTitle').innerText = titles[page];
    
    if (page === 'dashboard') renderDashboard();
    else renderList(page);
}

window.changeMonth = (m) => { CURRENT_MONTH = parseInt(m); loadPage(CURRENT_PAGE); }
window.changeYear = (y) => { CURRENT_YEAR = y; loadPage(CURRENT_PAGE); }

// --- HELPER: FILTRO POR MES ---
function filterByMonth(list) {
    if (CURRENT_MONTH === -1) return list; // -1 es Todo el Año
    return list.filter(item => {
        // Asumimos formato YYYY-MM-DD
        // Split '-' -> [YYYY, MM, DD]. Tomamos index 1 (mes), restamos 1 porque JS es 0-11
        if(!item.fecha) return false;
        const m = parseInt(item.fecha.split('-')[1]) - 1;
        return m === CURRENT_MONTH;
    });
}

function renderDashboard() {
    const container = document.getElementById('appContainer');
    container.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div></div>';
    
    // 1. Cargamos datos (Públicos y Privados)
    const pOfrendas = get(ref(db, `transacciones/${CURRENT_YEAR}/ofrendas`));
    const pPagos = get(ref(db, `transacciones/${CURRENT_YEAR}/pagos`));
    
    // TRUCO: Si es Admin lee la data real, si es Lector lee el resumen público
    const pDiezmos = IS_ADMIN 
        ? get(ref(db, `transacciones/${CURRENT_YEAR}/diezmos`)) 
        : get(ref(db, `resumen_publico/${CURRENT_YEAR}/diezmos`));

    Promise.all([pOfrendas, pPagos, pDiezmos]).then(snaps => {
        const ofrendasRaw = snaps[0].val() || {};
        const pagosRaw = snaps[1].val() || {};
        const diezmosData = snaps[2].val(); 

        const sumFiltered = (list) => filterByMonth(list).reduce((a,c) => a + parseFloat(c.monto || 0), 0);
        
        const totalOfrendas = sumFiltered(Object.values(ofrendasRaw));
        const totalPagos = sumFiltered(Object.values(pagosRaw));
        let totalDiezmos = 0;

        // CALCULO DE DIEZMOS
        if (IS_ADMIN) {
            // -- SOY ADMIN: Calculo real y actualizo el público --
            const listDiezmos = Object.values(diezmosData || {});
            // Calculamos el total del mes actual para guardarlo
            const totalMesActual = listDiezmos.filter(item => {
                if(!item.fecha) return false;
                return (parseInt(item.fecha.split('-')[1]) - 1) === CURRENT_MONTH;
            }).reduce((a,c) => a + parseFloat(c.monto), 0);

            // Calculamos el total anual para guardarlo
            const totalAnual = listDiezmos.reduce((a,c) => a + parseFloat(c.monto), 0);

            // ACTUALIZAMOS LA PIZARRA PÚBLICA (Para que los lectores vean el dato)
            const updates = {};
            updates[`resumen_publico/${CURRENT_YEAR}/diezmos/mes_${CURRENT_MONTH}`] = totalMesActual;
            updates[`resumen_publico/${CURRENT_YEAR}/diezmos/anual`] = totalAnual;
            update(ref(db), updates);

            // Para mostrar en pantalla ahora mismo
            totalDiezmos = (CURRENT_MONTH === -1) ? totalAnual : totalMesActual;

        } else {
            // -- SOY LECTOR: Solo leo el número --
            if (CURRENT_MONTH === -1) {
                totalDiezmos = diezmosData ? (diezmosData.anual || 0) : 0;
            } else {
                totalDiezmos = diezmosData ? (diezmosData[`mes_${CURRENT_MONTH}`] || 0) : 0;
            }
        }

const ing = totalDiezmos + totalOfrendas;
        const gas = totalPagos;
        
        // --- NUEVO CÓDIGO: SALDO DEL 2025 ---
        let saldoInicial = 0;
        let textoSaldo = "Disponible en caja"; // Texto normal

        // Si estamos viendo el año 2026, sumamos los 70 soles
        if (CURRENT_YEAR === "2026") {
            saldoInicial = 69.40; 
            textoSaldo = "Disponible (Incl. saldo 2025)"; // Avisamos que incluye saldo anterior
        }
        // ------------------------------------

        // Sumamos el saldo inicial al total
        const totalFinal = (ing - gas) + saldoInicial;
        
        // Renderizamos
        container.innerHTML = `
            <div class="row g-4 mb-4">
                <div class="col-lg-8">
                    <div class="card bg-dark text-white border-0 shadow rounded-4 p-4 h-100" style="background: linear-gradient(135deg, #0f172a 0%, #334155 100%);">
                        <h1 class="display-3 fw-bold my-2">S/. ${totalFinal.toFixed(2)}</h1>
                        <p class="mb-0 opacity-75">${textoSaldo}</p>
                    </div>
                </div>
                <div class="col-lg-4">
                    <div class="card border-0 shadow-sm rounded-4 p-4 h-100">
                        ${saldoInicial > 0 ? `<div class="d-flex justify-content-between mb-2 text-warning"><span>Saldo 2025</span> <strong>S/. ${saldoInicial.toFixed(2)}</strong></div>` : ''}
                        
                        <div class="d-flex justify-content-between mb-2"><span>Ofrendas</span> <strong>S/. ${totalOfrendas.toFixed(2)}</strong></div>
                        <div class="d-flex justify-content-between mb-2 text-primary"><span>Diezmos</span> <strong>S/. ${totalDiezmos.toFixed(2)}</strong></div>
                        <div class="d-flex justify-content-between text-danger"><span>Gastos</span> <strong>S/. ${totalPagos.toFixed(2)}</strong></div>
                    </div>
                </div>
            </div>
            <div class="row g-4">
                ${cardHTML('Diezmos', totalDiezmos, 'text-primary')}
                ${cardHTML('Ofrendas', totalOfrendas, 'text-info')}
                ${cardHTML('Gastos', totalPagos, 'text-danger')}
            </div>`;
    });
}
// Asegúrate de tener esta funcion auxiliar pequeña al final
function cardHTML(lbl, val, color) {
    return `<div class="col-6 col-md-3"><div class="stat-card text-center"><h6 class="text-uppercase text-muted fw-bold small">${lbl}</h6><h4 class="fw-bold ${color} mb-0">S/. ${val.toFixed(2)}</h4></div></div>`;
}


window.renderList = (type) => {
    const container = document.getElementById('appContainer');

    // --- 1. BLOQUE DE SEGURIDAD (LECTORES EN DIEZMOS) ---
    // Si es Lector y quiere ver Diezmos, le mostramos solo el total bonito y ocultamos la lista.
    if (type === 'diezmos' && !IS_ADMIN) {
        container.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div></div>';
        
        get(ref(db, `resumen_publico/${CURRENT_YEAR}/diezmos`)).then(snap => {
            const data = snap.val() || {};
            let montoMostrar = 0;
            if (CURRENT_MONTH === -1) montoMostrar = data.anual || 0;
            else montoMostrar = data[`mes_${CURRENT_MONTH}`] || 0;

            const monthsNames = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
            const label = CURRENT_MONTH === -1 ? 'Todo el Año' : monthsNames[CURRENT_MONTH];

            container.innerHTML = `
                <div class="row justify-content-center mt-4 fade-in">
                    <div class="col-md-6">
                        <div class="card border-0 shadow-lg rounded-4 text-center p-5">
                            <div class="mb-3">
                                <div class="mx-auto bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center" style="width: 70px; height: 70px; font-size: 2rem;">
                                    <i class="bi bi-shield-lock"></i>
                                </div>
                            </div>
                            <h6 class="text-uppercase text-muted fw-bold ls-2">Total Diezmos (${label})</h6>
                            <h1 class="display-3 fw-bold text-primary mb-3">S/. ${montoMostrar.toFixed(2)}</h1>
                            <p class="text-muted small mb-4">El detalle de los aportantes es información confidencial.</p>
                            <button onclick="loadPage('dashboard')" class="btn btn-outline-primary rounded-pill px-4">Volver al Inicio</button>
                        </div>
                    </div>
                </div>`;
        });
        return; 
    }

    // --- 2. CONFIGURACIÓN VISUAL ---
    const isExpense = type === 'pagos';
    const btnAdd = IS_ADMIN ? `<button class="btn ${isExpense?'btn-danger':'btn-primary'} rounded-pill px-4 shadow-sm" onclick="openForm('${type}')"><i class="bi bi-plus-lg me-1"></i> Registrar</button>` : '';
    const btnCats = (type === 'pagos' && IS_ADMIN) ? `<button class="btn btn-outline-secondary rounded-circle me-2" onclick="manageCategories()"><i class="bi bi-gear"></i></button>` : '';

    let tHeaders = `<th>FECHA</th><th>DETALLE</th><th class="text-end">MONTO</th><th class="text-center">VOUCHER</th>` + (IS_ADMIN ? `<th>ACCIÓN</th>` : '');
    if(type === 'diezmos') { tHeaders = `<th>HERMANO</th><th>MESES PAGADOS</th><th class="text-end">TOTAL</th><th class="text-center">HISTORIAL</th>`; }

    // ¡AQUI ESTÁ LA CORRECCIÓN! Agregué el div "totalSummaryBox" de nuevo
    container.innerHTML = `
        <div class="d-flex justify-content-end mb-4 align-items-center">${btnCats} ${btnAdd}</div>
        
        <div id="totalSummaryBox" class="fade-in"></div> 
        <div id="extraContent"></div>

        <div class="card border-0 shadow-sm rounded-4 overflow-hidden">
            <div class="table-responsive">
                <table class="table table-hover align-middle mb-0">
                    <thead class="bg-light"><tr>${tHeaders}</tr></thead>
                    <tbody id="tblBody"><tr><td colspan="5" class="text-center py-5">Cargando...</td></tr></tbody>
                </table>
            </div>
        </div>`;

    // --- 3. CARGA DE DATOS ---
    onValue(ref(db, `transacciones/${CURRENT_YEAR}/${type}`), (snap) => {
        const rawData = snap.val() || {};
        
        // Restaurar memoria buscador
        if (type === 'diezmos') {
            ALL_MEMBERS_CACHE = Object.values(rawData); 
        }

        let list = Object.entries(rawData).map(([k,v])=>({id:k,...v})).sort((a,b)=>new Date(b.fecha)-new Date(a.fecha));
        list = filterByMonth(list);

        // --- CÁLCULO DEL TOTAL PARA LA TARJETA ---
        const totalAmount = list.reduce((sum, item) => sum + parseFloat(item.monto || 0), 0);
        const summaryBox = document.getElementById('totalSummaryBox');
        
        if(summaryBox) {
            // Configuración de colores e iconos según la sección
            const cfg = {
                'diezmos': { label: 'Total Diezmos Recibido', icon: 'bi-people-fill', color: 'text-primary' },
                'ofrendas': { label: 'Total Ofrendas Recibido', icon: 'bi-basket-fill', color: 'text-success' },
                'pagos': { label: 'Total Gastos Realizados', icon: 'bi-arrow-down-circle-fill', color: 'text-danger' }
            }[type] || { label: 'Total', icon: 'bi-cash', color: 'text-dark' };

            summaryBox.innerHTML = `
                <div class="summary-header b-${type}">
                    <div>
                        <div class="summary-label">${cfg.label}</div>
                        <div class="summary-amount ${type==='pagos'?'text-danger':''}">S/. ${totalAmount.toFixed(2)}</div>
                        <small class="text-muted">En el periodo seleccionado</small>
                    </div>
                    <div class="summary-icon">
                        <i class="bi ${cfg.icon} ${cfg.color}"></i>
                    </div>
                </div>
            `;
        }
        // ----------------------------------------

        const tbody = document.getElementById('tblBody');
        if(!tbody) return;
        tbody.innerHTML = list.length ? '' : '<tr><td colspan="5" class="text-center text-muted py-5">Sin registros</td></tr>';
        
        if (type === 'diezmos') {
            // VISTA DIEZMOS (Solo Admin)
            const grouped = {};
            list.forEach(item => {
                const n = item.nombre.trim();
                if(!grouped[n]) grouped[n] = { total: 0, txs: [], genero: item.genero || 'M' };
                grouped[n].total += parseFloat(item.monto);
                grouped[n].txs.push(item);
            });

            const gridDiv = document.getElementById('extraContent');
            gridDiv.innerHTML = `<div class="mb-4"><div id="gridDiezmos" class="row g-3"></div></div>`;
            renderInteractiveGrid(grouped);

            Object.keys(grouped).sort().forEach(name => {
                const g = grouped[name];
                const safeData = encodeURIComponent(JSON.stringify(g.txs));
                const avatarClass = (g.genero === 'F') ? 'avatar-f' : 'avatar-m';
                const months = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
                const paidMonths = [...new Set(g.txs.filter(t=>t.mesCorrespondiente!==undefined).map(t=>t.mesCorrespondiente))].sort((a,b)=>a-b);
                const monthBadges = paidMonths.map(m => `<span class="badge bg-light text-secondary border fw-normal me-1">${months[m]}</span>`).join('');

                tbody.innerHTML += `
                <tr>
                    <td><div class="d-flex align-items-center"><div class="avatar-circle ${avatarClass}"><i class="bi bi-person"></i></div><span class="fw-bold">${name}</span></div></td>
                    <td>${monthBadges}</td>
                    <td class="text-end fw-bold text-primary">S/. ${g.total.toFixed(2)}</td>
                    <td class="text-center"><button class="btn btn-sm btn-light border rounded-pill px-3" onclick="showMemberDetail('${name}', '${safeData}')">Ver</button></td>
                </tr>`;
            });

        } else {
            // VISTA OFRENDAS Y GASTOS
            list.forEach(i => {
                let desc = i.nombre;
                if(type === 'pagos') desc = `<span class="text-danger fw-bold">${i.categoriaGasto || 'Gasto'}</span> - ${desc}`;
                if(type === 'ofrendas' && i.diaServicio) {
                     const colorMap = { 'Domingo': 'day-domingo', 'Miércoles': 'day-miercoles', 'Viernes': 'day-viernes', 'Sábado': 'day-sabado', 'Especial': 'day-especial' };
                     desc = `<span class="day-badge ${colorMap[i.diaServicio]||'day-default'}">${i.diaServicio}</span> ${desc}`;
                }
                
                tbody.innerHTML += `
                <tr>
                    <td class="ps-4 fw-bold text-secondary small">${i.fecha}</td>
                    <td>${desc}</td>
                    <td class="text-end fw-bold ${type==='pagos'?'text-danger':'text-dark'}">S/. ${parseFloat(i.monto).toFixed(2)}</td>
                    <td class="text-center">${i.voucherUrl ? `<button class="btn btn-sm btn-light" onclick="viewImg('${i.voucherUrl}','${i.fecha}')"><i class="bi bi-image"></i></button>` : '-'}</td>
                    ${IS_ADMIN ? `<td class="text-center"><button class="btn btn-sm btn-light text-danger" onclick="delItem('${type}','${i.id}')"><i class="bi bi-trash"></i></button></td>` : ''}
                </tr>`;
            });
        }
    });
}
function renderInteractiveGrid(groupedData) {
    const div = document.getElementById('gridDiezmos');
    if(!div) return;
    div.innerHTML = '';
    
    Object.keys(groupedData).sort().forEach(name => {
        const g = groupedData[name];
        const safeData = encodeURIComponent(JSON.stringify(g.txs));
        const avatarClass = (g.genero === 'F') ? 'avatar-f' : 'avatar-m';
        const iconClass = (g.genero === 'F') ? 'bi-person-standing-dress' : 'bi-person';
        
        // Meses pagados (en este contexto del filtro)
        const paidM = new Set(g.txs.filter(t=>t.mesCorrespondiente!==undefined).map(t=>t.mesCorrespondiente));
        
        // Generar los dots. Si estamos viendo un mes específico, quizás solo nos interesa ese mes,
        // pero mantener la vista anual da contexto. Resaltaremos los pagados en este periodo.
        const gridDots = [0,1,2,3,4,5,6,7,8,9,10,11].map(m => {
            const isPaid = paidM.has(m);
            const monthsShort = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
            // Si no está pagado, mostramos opacidad baja
            return `<span class="month-badge ${isPaid?'paid':''}" style="${!isPaid?'opacity:0.3':''}">${monthsShort[m]}</span>`;
        }).join('');

        div.innerHTML += `
        <div class="col-xl-3 col-md-4 col-sm-6">
            <div class="member-card" onclick="showMemberDetail('${name}', '${safeData}')">
                <div class="d-flex align-items-center mb-3">
                    <div class="avatar-circle ${avatarClass}"><i class="bi ${iconClass}"></i></div>
                    <div class="overflow-hidden">
                        <h6 class="fw-bold text-truncate mb-0 text-dark">${name}</h6>
                        <small class="text-muted">Total Periodo: S/. ${g.total.toFixed(2)}</small>
                    </div>
                </div>
                <div style="display:flex; flex-wrap:wrap; justify-content:center;">
                    ${gridDots}
                </div>
            </div>
        </div>`;
    });
}

window.showMemberDetail = (name, encodedData) => {
    const txs = JSON.parse(decodeURIComponent(encodedData));
    const months = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
    let listHTML = `<div class="bg-light p-3 rounded mt-2 text-start" style="max-height:300px; overflow-y:auto;">`;
    txs.forEach(t => {
        const mesLabel = t.mesCorrespondiente !== undefined ? `<span class="badge bg-primary">${months[t.mesCorrespondiente]}</span>` : '<span class="badge bg-secondary">Extra</span>';
        listHTML += `
            <div class="d-flex justify-content-between align-items-center border-bottom py-2 bg-white px-2 mb-1 rounded">
                <div class="d-flex align-items-center gap-2">
                    ${mesLabel} <small class="text-muted">${t.fecha}</small>
                </div>
                <div class="d-flex align-items-center gap-2">
                    <span class="fw-bold text-dark">S/. ${parseFloat(t.monto).toFixed(2)}</span>
                    ${t.voucherUrl ? `<button class="btn btn-sm btn-light border" onclick="viewImg('${t.voucherUrl}','${t.fecha}')"><i class="bi bi-image"></i></button>` : ''}
                    ${IS_ADMIN ? `<button class="btn btn-sm btn-light text-danger" onclick="delItem('diezmos','${t.id}')"><i class="bi bi-trash"></i></button>` : ''}
                </div>
            </div>`;
    });
    listHTML += `</div>`;
    Swal.fire({ title: name, html: listHTML, showConfirmButton: true, confirmButtonText: 'Cerrar', width: 500, showCloseButton: true });
}

// --- FORMULARIO Y GESTION ---
window.selectGender = (g) => {
    document.querySelectorAll('.gender-card').forEach(c => c.classList.remove('selected'));
    if(g === 'M') { document.getElementById('cardMale').classList.add('selected'); document.querySelector('input[name="genero"][value="M"]').checked = true; }
    else { document.getElementById('cardFemale').classList.add('selected'); document.querySelector('input[name="genero"][value="F"]').checked = true; }
}

const searchInput = document.getElementById('f_nombre');
const suggestionsBox = document.getElementById('suggestionsBox');
searchInput.addEventListener('input', showSuggestions);
searchInput.addEventListener('focus', showSuggestions);
document.addEventListener('click', (e) => { if (!e.target.closest('.search-dropdown-wrapper')) suggestionsBox.classList.remove('active'); });

function showSuggestions() {
    if(document.getElementById('formType').value !== 'diezmos') return;
    const val = searchInput.value.toLowerCase();
    const unique = {};
    // Usamos ALL_MEMBERS_CACHE que contiene todo el año
    ALL_MEMBERS_CACHE.forEach(m => { if(!unique[m.nombre]) unique[m.nombre] = m.genero; });
    let matches = Object.keys(unique).filter(n => n.toLowerCase().includes(val));
    if(matches.length > 0) {
        suggestionsBox.innerHTML = matches.map(n => {
            const gen = unique[n] || 'M';
            const avatar = gen === 'F' ? '<span style="color:#be185d">👩</span>' : '<span style="color:#1d4ed8">👨</span>';
            return `<div class="suggestion-item" onclick="selectSuggestion('${n}', '${gen}')"><div class="s-avatar border bg-light">${avatar}</div><span>${n}</span></div>`;
        }).join('');
        suggestionsBox.classList.add('active');
    } else suggestionsBox.classList.remove('active');
}

window.selectSuggestion = (name, gender) => { searchInput.value = name; selectGender(gender || 'M'); suggestionsBox.classList.remove('active'); }

window.openForm = async (type) => {
    document.getElementById('dataForm').reset();
    document.getElementById('formType').value = type;
    document.getElementById('f_fecha').valueAsDate = new Date();
    document.querySelectorAll('.field-conditional').forEach(e => e.classList.add('d-none'));
    selectGender('M'); 
    const hdr = document.getElementById('modalHeader');
    const btn = document.getElementById('btnGuardar');
    hdr.style.background = type==='pagos' ? '#ef4444' : 'var(--corp-dark)';
    btn.className = `btn px-4 ${type==='pagos'?'btn-danger':'btn-primary'}`;
    if(type === 'diezmos') { document.getElementById('divMesDiezmo').classList.remove('d-none'); searchInput.placeholder = "Buscar hermano..."; }
    else if(type === 'ofrendas') { document.getElementById('divOfrendaDia').classList.remove('d-none'); searchInput.placeholder = "Detalle..."; }
    else if(type === 'pagos') { document.getElementById('divPagoTipo').classList.remove('d-none'); await loadCategoriasSelect(); searchInput.placeholder = "Descripción..."; }
    new bootstrap.Modal('#transactionModal').show();
}

async function loadCategoriasSelect() {
    const snap = await get(ref(db, 'configuracion/categorias_gastos'));
    const cats = snap.val() || ["Alquiler", "Servicios", "Mantenimiento", "Ayuda Social", "Honorarios", "Otros"];
    document.getElementById('f_tipo_pago').innerHTML = cats.map(c => `<option value="${c}">${c}</option>`).join('');
}

window.manageCategories = async () => {
    const snap = await get(ref(db, 'configuracion/categorias_gastos'));
    let cats = snap.val() || ["Alquiler", "Servicios", "Mantenimiento", "Ayuda Social", "Honorarios", "Otros"];
    const { value: text } = await Swal.fire({ title: 'Categorías', input: 'textarea', inputValue: cats.join(', '), showCancelButton: true });
    if (text) {
        const newCats = text.split(',').map(s => s.trim()).filter(s => s);
        await set(ref(db, 'configuracion/categorias_gastos'), newCats);
        Toast.fire({ icon: 'success', title: 'Guardado', background: '#10b981', color:'white' });
        if(CURRENT_PAGE === 'pagos') renderList('pagos');
    }
}

window.saveTransaction = async () => {
    const type = document.getElementById('formType').value;
    const fecha = document.getElementById('f_fecha').value;
    let nombre = document.getElementById('f_nombre').value;
    const monto = document.getElementById('f_monto').value;
    const file = document.getElementById('f_file').files[0];
    if(!monto || !fecha) return Toast.fire({ icon: 'warning', title: 'Faltan datos' });
    if(type!=='ofrendas' && !nombre) return Toast.fire({ icon: 'warning', title: 'Falta nombre' });
    if(!nombre) nombre = 'Anónimo';
    Swal.showLoading();
    let url = '';
    if(file) {
        const fd = new FormData(); fd.append("image", file);
        try { const r = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, { method: "POST", body: fd }); const j = await r.json(); if(j.success) url = j.data.url; } catch(e) {}
    }
    const data = { fecha, nombre, monto: parseFloat(monto), voucherUrl: url };
    if(type==='diezmos') { data.mesCorrespondiente = parseInt(document.getElementById('f_mes_diezmo').value); data.genero = document.querySelector('input[name="genero"]:checked').value; }
    if(type==='ofrendas') data.diaServicio = document.getElementById('f_dia_ofrenda').value;
    if(type==='pagos') data.categoriaGasto = document.getElementById('f_tipo_pago').value;
    try { await push(ref(db, `transacciones/${CURRENT_YEAR}/${type}`), data); bootstrap.Modal.getInstance(document.getElementById('transactionModal')).hide(); Swal.close(); Toast.fire({ icon: 'success', title: 'Guardado', background: '#10b981', color:'white' }); } catch(e) { Toast.fire({ icon: 'error', title: 'Error' }); }
}

window.delItem = (t,id) => {
    Swal.fire({ title: '¿Borrar?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Sí, borrar' }).then(r => {
        if(r.isConfirmed) { remove(ref(db, `transacciones/${CURRENT_YEAR}/${t}/${id}`)); Toast.fire({ icon: 'success', title: 'Eliminado' }); if(Swal.isVisible()) Swal.close(); }
    });
}

window.viewImg = (u, f) => {
    // Diseño HTML del voucher mejorado
    const voucherHTML = `
        <div class="voucher-card">
            <div class="voucher-header">
                <h5 class="fw-bold m-0 text-uppercase ls-2 opacity-75" style="font-size: 0.8rem;">Comprobante de Operación</h5>
                <div class="fw-bold fs-5 mt-1">Camino de Santidad</div>
            </div>

            <div class="voucher-icon-box">
                <i class="bi bi-check-lg"></i>
            </div>

            <div class="voucher-body">
                <h4 class="fw-bold text-dark mb-1">Operación Exitosa</h4>
                <p class="text-muted small mb-3">${f}</p>

                <div class="voucher-dashed-line"></div>

                <div class="text-start mb-2">
                    <small class="fw-bold text-muted text-uppercase" style="font-size: 0.7rem;">Evidencia Adjunta:</small>
                </div>

                <div class="voucher-img-container">
                    <img src="${u}" style="width:100%; border-radius: 8px; display:block;" alt="Voucher">
                </div>
            </div>
        </div>
    `;

    // Lanzar la alerta con fondo transparente
    Swal.fire({
        html: voucherHTML,
        showConfirmButton: true,
        confirmButtonText: 'Cerrar Comprobante',
        width: 380, // Ancho ideal para parecer celular
        padding: 0,
        background: 'transparent', // Importante para que se vean los bordes redondos
        customClass: {
            confirmButton: 'btn btn-dark rounded-pill px-5 shadow-sm mt-3 mb-2'
        },
        showCloseButton: false // Quitamos la X de arriba para que se vea más limpio
    });
}

window.toggleSidebar = () => { document.getElementById('sidebar').classList.toggle('active'); document.querySelector('.overlay').classList.toggle('active'); }
window.addYear = async () => { const {value:y} = await Swal.fire({ title:'Nuevo Año', input:'number', inputValue: parseInt(CURRENT_YEAR)+1 }); if(y) update(ref(db, 'configuracion/anos'), {[y]:true}); }
onValue(ref(db, 'configuracion/anos'), s => {
    // Aquí forzamos a que existan 2025 y 2026 si no hay nada en la base de datos
    const ys = s.val() || { "2025": true, "2026": true };
    
    // Asegurarnos que 2025 y 2026 estén en la lista aunque la base de datos tenga otros
    ys["2025"] = true;
    ys["2026"] = true;

    document.getElementById('yearSelector').innerHTML = Object.keys(ys).sort().reverse().map(y=>`<option value="${y}" ${y==CURRENT_YEAR?'selected':''}>${y}</option>`).join(''); 
});



