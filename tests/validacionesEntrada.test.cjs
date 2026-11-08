const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { validarID } = require('../Modelos/validacionModel');

const vista = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname, '../Public/js/validaciones.js'), 'utf8').replace(/^export /gm, ''), vista);

test('IDs: interfaz y proceso principal acuerdan tipos, formato y límites', () => {
    const invalidos = [undefined, null, true, false, {}, [], '', ' ', '12abc', '1e2', '0x10', '-1', '1.2', '1 2', 0, -1, 1.2, NaN, Infinity, '9007199254740992'];
    for (const id of invalidos) {
        assert.equal(vista.esIDValido(id), false);
        assert.throws(() => validarID(id), { code: 'INVALID_ID' });
        for (const validar of [vista.validarIDPareja, vista.validarIDCategoria, vista.validarIDEstilo]) {
            assert.throws(() => validar(id), /ID/);
        }
    }
    for (const id of [1, '1', ' 42 ', '00042', Number.MAX_SAFE_INTEGER]) {
        assert.equal(vista.esIDValido(id), true);
        assert.equal(validarID(id), Number(id));
    }
});

test('IDs: escritura y pegado inválidos se rechazan completos conservando el valor anterior', () => {
    const eventos = {}, avisos = [];
    const input = { value: '42', addEventListener: (tipo, fn) => { eventos[tipo] = fn; } };
    vista.restringirEntradaID(input, texto => avisos.push(texto));
    for (const texto of ['A', '12a3', '-1', '1.5', '1e2', '１２', '1 OR 1=1']) {
        for (const tipo of ['beforeinput', 'paste']) {
            let impedido = false;
            eventos[tipo]({ data: texto, clipboardData: { getData: () => texto }, preventDefault() { impedido = true; } });
            assert.equal(impedido, true);
            assert.equal(input.value, '42');
            assert.match(avisos.at(-1), /dígitos/);
        }
    }
    for (const texto of ['123', '', null]) {
        eventos.beforeinput({ data: texto, preventDefault() { assert.fail('Permitir dígitos y borrado'); } });
    }
    eventos.paste({ clipboardData: { getData: () => '123' }, preventDefault() { assert.fail('Permitir pegado numérico'); } });
});

test('nombres: se cuentan letras, conservando nombres Unicode, guiones y apóstrofos', () => {
    const datos = { nParejaID: '1' };
    for (const lado of ['Masculino', 'Femenino']) Object.assign(datos, {
        ['cNombre' + lado]: 'Ana', ['cApellido' + lado]: 'Pérez', ['cEmail' + lado]: 'test@example.test',
        ['nTelefono' + lado]: '5512345678', ['dNacimiento' + lado]: '2000-01-01'
    });
    for (const campo of ['cNombreMasculino', 'cApellidoMasculino', 'cNombreFemenino', 'cApellidoFemenino']) {
        for (const nombre of ['A', ' A ', 'A-', "A'", 'Aʼ', 'ʼʼ', 'A .', 'Á', 'A\u0301', '---']) {
            assert.throws(() => vista.validarDatosPareja({ ...datos, [campo]: nombre }), /dos letras/);
        }
        for (const nombre of ['Li', 'Jo', 'María-José', "O'Neill", 'D’Ávila', 'A\u0301l']) {
            const copia = { ...datos, [campo]: nombre };
            vista.validarDatosPareja(copia);
            assert.equal(copia[campo], nombre.normalize('NFC'));
        }
    }
});
