const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function modelo(usuarios, { falloCommit = false } = {}) {
    const llamadas = [], datos = usuarios.map(u => ({ ...u }));
    let cola = Promise.resolve();
    const db = { withTransaction(tablas, fn) {
        assert.deepEqual(Array.from(tablas), ['t_usuarios']);
        const trabajo = cola.then(async () => {
            const copia = datos.map(u => ({ ...u }));
            const resultado = await fn(async (sql, args) => {
                llamadas.push(sql);
                if (sql.includes("rol = 'admin'")) {
                    assert.match(sql, /ORDER BY nUsuarioID FOR UPDATE/);
                    return copia.filter(u => u.rol === 'admin');
                }
                if (sql.startsWith('SELECT')) return copia.filter(u => u.nombre === args[0]);
                const indice = copia.findIndex(u => u.nUsuarioID === args[0]);
                if (indice < 0) return { affectedRows: 0 };
                copia.splice(indice, 1); return { affectedRows: 1 };
            });
            if (falloCommit) throw Error('Commit falló');
            datos.splice(0, datos.length, ...copia); return resultado;
        });
        cola = trabajo.catch(() => {}); return trabajo;
    } };
    const module = { exports: {} };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../Modelos/adminModel.js'), 'utf8'), {
        module, require(name) {
            if (name === '../db') return db;
            if (name === './parejaModel') return {};
            if (name === '../Seguridad/identidad') return require('../Seguridad/identidad');
            throw Error(name);
        }
    });
    return { ...module.exports, datos, llamadas };
}
const a = { nUsuarioID: 'A001', nombre: 'AdminA', rol: 'admin' };
const b = { nUsuarioID: 'A002', nombre: 'AdminB', rol: 'admin' };

test('administración: autoeliminación y actor no administrador nunca ejecutan DELETE', async () => {
    const m = modelo([a, b]);
    await assert.rejects(m.eliminarUsuario('AdminA', 'A001'), { code: 'SELF_DELETE' });
    await assert.rejects(m.eliminarUsuario('AdminA', 'U001'), { code: 'FORBIDDEN' });
    assert.equal(m.llamadas.some(sql => sql.startsWith('DELETE')), false);
});

test('administración: dos bajas cruzadas conservan una cuenta administradora', async () => {
    const m = modelo([a, b]);
    const resultados = await Promise.allSettled([m.eliminarUsuario('AdminB', 'A001'), m.eliminarUsuario('AdminA', 'A002')]);
    assert.equal(resultados.filter(r => r.status === 'fulfilled').length, 1);
    assert.equal(m.datos.length, 1); assert.equal(m.datos[0].rol, 'admin');
});

test('administración: un fallo transaccional no confirma eliminación al controlador', async () => {
    const m = modelo([a, b], { falloCommit: true });
    await assert.rejects(m.eliminarUsuario('AdminB', 'A001'), /Commit falló/); assert.equal(m.datos.length, 2);
});

test('administración: los nombres duplicados se rechazan sin eliminación masiva', async () => {
    const m = modelo([a, { nUsuarioID: 'U001', nombre: 'Ana', rol: 'user' }, { nUsuarioID: 'U002', nombre: 'Ana', rol: 'juez' }]);
    await assert.rejects(m.eliminarUsuario('Ana', 'A001'), { code: 'AMBIGUOUS_USER' }); assert.equal(m.datos.length, 3);
});
