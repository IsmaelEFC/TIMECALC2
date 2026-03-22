/**
 * TIMECALC - Calculadora de Desfases para DVR
 * @author Ismael Flores
 * @year 2023
 */

// Variable global para almacenar el desfase actual en segundos
let globalDiffSeconds = null;
let isManualOffset = false;

$(document).ready(function () {
    // Configuración Regional Datepicker
    $.datepicker.setDefaults($.datepicker.regional['es']);

    const datepickerOptions = {
        dateFormat: 'dd/mm/yy',
        autoclose: true,
        todayHighlight: true,
        changeMonth: true,
        changeYear: true,
        showAnim: "fadeIn"
    };

    // Inicializar Datepickers
    $('#fechaDVR, #fechaOficial, #nuevaFecha, #nuevaFecha2, #fechaBaseManual').datepicker(datepickerOptions);

    /**
     * Gestión de Campos de Hora (Input Masking & Validation)
     */
    $('.timepicker').on('input', function () {
        let value = $(this).val().replace(/\D/g, '');
        if (value.length > 0) {
            let formatted = '';
            if (value.length <= 2) formatted = value;
            else if (value.length <= 4) formatted = value.slice(0, 2) + ':' + value.slice(2);
            else formatted = value.slice(0, 2) + ':' + value.slice(2, 4) + ':' + value.slice(4, 6);
            $(this).val(formatted);
        }
    }).on('blur', function () {
        const value = $(this).val();
        if (value && !validateTime(value)) {
            $(this).val('');
            $(this).addClass('is-invalid');
        } else if (value) {
            $(this).removeClass('is-invalid');
            $(this).val(formatTime(value));
            autocompleteDate($(this).attr('id'));
            
            // Si se editan los campos principales, desactivamos el modo manual
            if (['horaDVR', 'horaOficial'].includes($(this).attr('id'))) {
                isManualOffset = false;
                if (isMainFormReady()) calcularDiferencia();
            }
        }
    });

    // Detectar cambios en fechas principales para resetear manual
    $('#fechaDVR, #fechaOficial').on('change', function() {
        isManualOffset = false;
        if (isMainFormReady()) calcularDiferencia();
    });

    // Deshabilitar clic derecho
    document.addEventListener('contextmenu', e => e.preventDefault());
});

/**
 * Validaciones y Utilidades
 */
function validateTime(value) {
    return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/.test(value);
}

function isMainFormReady() {
    return $('#fechaDVR').val() && $('#horaDVR').val() && 
           $('#fechaOficial').val() && $('#horaOficial').val();
}

function formatTime(value) {
    const parts = value.split(':');
    const hh = parts[0].padStart(2, '0');
    const mm = (parts[1] || '00').padStart(2, '0');
    const ss = (parts[2] || '00').padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
}

function autocompleteDate(timepickerId) {
    const mapping = {
        'horaDVR': 'fechaDVR',
        'horaOficial': 'fechaOficial',
        'nuevaHoraOficial': 'nuevaFecha',
        'nuevaHoraOficial2': 'nuevaFecha2',
        'horaBaseManual': 'fechaBaseManual'
    };
    const dateId = mapping[timepickerId];
    if (dateId && !$('#' + dateId).val()) {
        $('#' + dateId).val(moment().format('DD/MM/YYYY'));
    }
}

function toggleSeccion(id) {
    $(`#${id}`).slideToggle();
}

/**
 * Lógica de Negocio: SECCIÓN 1 - Diferencia Principal
 */
function calcularDiferencia() {
    const fDvr = $('#fechaDVR').val();
    const hDvr = $('#horaDVR').val();
    const fOfi = $('#fechaOficial').val();
    const hOfi = $('#horaOficial').val();

    if (!fDvr || !hDvr || !fOfi || !hOfi) {
        if (!isManualOffset) {
            $('#resultado').html('<span class="text-warning">Complete todos los campos superiores</span>');
        }
        return;
    }

    const dvr = moment.utc(`${fDvr} ${hDvr}`, 'DD/MM/YYYY HH:mm:ss');
    const ofi = moment.utc(`${fOfi} ${hOfi}`, 'DD/MM/YYYY HH:mm:ss');
    
    if (!dvr.isValid() || !ofi.isValid()) return;

    const diff = moment.duration(dvr.diff(ofi));
    globalDiffSeconds = diff.asSeconds();
    isManualOffset = false;
    
    actualizarUIVisual(diff);
}

/**
 * Lógica de Negocio: SECCIÓN 4 - Desfase Manual
 */
function calcularConDesfaseManual() {
    const anos = parseInt($('#manualAnos').val()) || 0;
    const meses = parseInt($('#manualMeses').val()) || 0;
    const dias = parseInt($('#manualDias').val()) || 0;
    const horas = parseInt($('#manualHoras').val()) || 0;
    const minutos = parseInt($('#manualMinutos').val()) || 0;
    const segundos = parseInt($('#manualSegundos').val()) || 0;

    const tipo = $('input[name="manualTipo"]:checked').val();
    
    // Crear un objeto moment duration
    const duration = moment.duration({
        years: anos,
        months: meses,
        days: dias,
        hours: horas,
        minutes: minutos,
        seconds: segundos
    });

    globalDiffSeconds = duration.asSeconds();
    if (tipo === 'retraso') globalDiffSeconds = -globalDiffSeconds;
    
    isManualOffset = true;
    
    // Actualizar la UI principal con este desfase
    actualizarUIVisual(duration, tipo);
    
    // Si hay una fecha base en la sección manual, también calculamos el resultado allí
    const fechaBase = $('#fechaBaseManual').val();
    const horaBase = $('#horaBaseManual').val();
    
    let extraResult = '';
    if (fechaBase && horaBase) {
        const base = moment.utc(`${fechaBase} ${horaBase}`, 'DD/MM/YYYY HH:mm:ss');
        if (base.isValid()) {
            const result = base.clone().add(globalDiffSeconds, 'seconds');
            extraResult = `<div class="result-text text-info mt-2">
                Resultado para la fecha base:<br>
                <strong>${result.format('DD/MM/YYYY HH:mm:ss')}</strong>
            </div>`;
        }
    }
    
    // Feedback en la sección manual
    $('#resultadoManual').html(`
        <div class="result-text" style="color: var(--accent-success); border-left-color: var(--accent-success);">
            <i class="fa-solid fa-circle-check me-2"></i>¡Desfase cargado en el panel principal!
        </div>
        ${extraResult}
    `);

    // Minimizar la sección manual después de un breve momento para que vean el feedback
    setTimeout(() => {
        $('#seccionManual').slideUp();
        
        // Hacer scroll suave hacia arriba para que vean el resultado principal
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 800);
}

/**
 * Actualiza la visualización del desfase en el cuadro de resultados principal
 */
function actualizarUIVisual(duration, forcedType = null) {
    const seconds = globalDiffSeconds;
    const parts = [];
    
    // Obtener componentes de la duración
    // Si duration es moment.duration, usamos sus métodos
    const absDiff = {
        y: Math.abs(duration.years()),
        m: Math.abs(duration.months()),
        d: Math.abs(duration.days()),
        h: Math.abs(duration.hours()),
        i: Math.abs(duration.minutes()),
        s: Math.abs(duration.seconds())
    };

    if (absDiff.y) parts.push(`${absDiff.y} año${absDiff.y > 1 ? 's' : ''}`);
    if (absDiff.m) parts.push(`${absDiff.m} mes${absDiff.m > 1 ? 'es' : ''}`);
    if (absDiff.d) parts.push(`${absDiff.d} día${absDiff.d > 1 ? 's' : ''}`);
    if (absDiff.h) parts.push(`${absDiff.h} hora${absDiff.h > 1 ? 's' : ''}`);
    if (absDiff.i) parts.push(`${absDiff.i} minuto${absDiff.i > 1 ? 's' : ''}`);
    if (absDiff.s) parts.push(`${absDiff.s} segundo${absDiff.s > 1 ? 's' : ''}`);

    let resHtml = 'Sin desfase detectado';
    let msgHtml = '';

    if (parts.length > 0 || seconds !== 0) {
        const text = parts.length > 1 
            ? parts.slice(0, -1).join(', ') + ' y ' + parts.slice(-1)
            : (parts[0] || '0 segundos');
            
        const manualBadge = isManualOffset ? '<span class="badge bg-info ms-2" style="font-size: 0.6rem;">MANUAL</span>' : '';
        resHtml = `Desfase: <span class="difference">${text}</span>${manualBadge}`;
        
        const type = forcedType || (seconds > 0 ? 'adelanto' : 'retraso');
        msgHtml = `<span class="${type}">${type.toUpperCase()}</span> respecto a la hora oficial.`;
    } else if (isManualOffset) {
        // Caso especial para cuando cargan 0 manual
        resHtml = `Desfase: <span class="difference">0 segundos</span><span class="badge bg-info ms-2" style="font-size: 0.6rem;">MANUAL</span>`;
        msgHtml = 'Sin desfase detectado.';
    }

    $('#resultado').html(resHtml);
    $('#mensaje').html(msgHtml);

    // Animación de actualización
    const $display = $('.result-display');
    $display.removeClass('updated');
    setTimeout(() => $display.addClass('updated'), 10);
}

/**
 * Lógica de Negocio: SECCIÓN 2 - Calcular Hora DVR (Búsqueda)
 */
function calcularNuevaHoraDvr() {
    const nFec = $('#nuevaFecha').val();
    const nHor = $('#nuevaHoraOficial').val();

    if (globalDiffSeconds === null) {
        alert('Debe calcular o ingresar un desfase primero.');
        return;
    }
    if (!nFec || !nHor) {
        alert('Ingrese la fecha y hora oficial del hecho.');
        return;
    }

    const target = moment.utc(`${nFec} ${nHor}`, 'DD/MM/YYYY HH:mm:ss');
    if (!target.isValid()) return;

    const result = target.clone().add(globalDiffSeconds, 'seconds');

    $('#nuevoResultado').html(`
        <div class="result-text">
            Hora a buscar en DVR:<br>
            <span class="difference">${result.format('DD/MM/YYYY HH:mm:ss')}</span>
        </div>
    `);
}

/**
 * Lógica de Negocio: SECCIÓN 3 - Calcular Hora Oficial
 */
function calcularNuevaHora2() {
    const nFec2 = $('#nuevaFecha2').val();
    const nHor2 = $('#nuevaHoraOficial2').val();

    if (globalDiffSeconds === null) {
        alert('Debe calcular o ingresar un desfase primero.');
        return;
    }
    if (!nFec2 || !nHor2) {
        alert('Ingrese la fecha y hora vista en el DVR.');
        return;
    }

    const target = moment.utc(`${nFec2} ${nHor2}`, 'DD/MM/YYYY HH:mm:ss');
    if (!target.isValid()) return;

    // Para obtener la hora oficial desde la del DVR, restamos el desfase (DVR = OFI + DIFF -> OFI = DVR - DIFF)
    const result = target.clone().subtract(globalDiffSeconds, 'seconds');

    $('#nuevoResultado2').html(`
        <div class="result-text">
            Hora Oficial Real:<br>
            <span class="difference">${result.format('DD/MM/YYYY HH:mm:ss')}</span>
        </div>
    `);
}
