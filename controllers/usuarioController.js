import { check, validationResult } from 'express-validator'
import bcrypt from 'bcrypt'
import Usuario from '../models/Usuario.js'
import { generateID, generarJWT } from '../helpers/tokens.js'
import { emailRegistro, emailOlvidePassword } from '../helpers/emails.js'
import moment from 'moment'
import pool from '../config/db.js'; 
import multer from 'multer';

const formularioLogin = (req, res) => {
    res.render('auth/login', {
        pagina: 'Iniciar Sesión',
        csrfToken: req.csrfToken()
    })
}

const autenticar = async (req, res) => {
    //validación
    await check('email').isEmail().withMessage('El email es obligatorio').run(req)
    await check('password').notEmpty().withMessage('El password es obligatorio').run(req)

    let resultado = validationResult(req)

    //verificar que el resultado este vacio
    if (!resultado.isEmpty()) {
        return res.render('auth/login', {
            pagina: 'Iniciar Sesión',
            csrfToken: req.csrfToken(),
            errores: resultado.array(),
        })
    }


    const { email, password } = req.body
    //comprobar si el usuario existe
    const usuario = await Usuario.findOne({ where: { email } })

    if (!usuario) {
        return res.render('auth/login', {
            pagina: 'Iniciar Sesión',
            csrfToken: req.csrfToken(),
            errores: [{ msg: 'El usuario no existe' }]
        })
    }

    //comprobar si el usuario esta confirmado
    if (!usuario.confirmado) {
        return res.render('auth/login', {
            pagina: 'Iniciar Sesión',
            csrfToken: req.csrfToken(),
            errores: [{ msg: 'Tu cuenta no ha sido confirmada' }]
        })
    }

    //Revisar el password
    if (!usuario.verificarPassword(password)) {
        return res.render('auth/login', {
            pagina: 'Iniciar Sesión',
            csrfToken: req.csrfToken(),
            errores: [{ msg: 'El password es incorrecto' }]
        })
    }

    //Autenticar al usuario
    const token = generarJWT({ id: usuario.id, nombre: usuario.nombre });

    console.log(token);

    //Almacenar en un cookie

    return res.cookie('_token', token, {
        httpOnly: true,
        //secure: true
    }).redirect('/mis-propiedades')

}

const cerrarSesion = (req, res) => {
    return res.clearCookie('_token').status(200).redirect('/auth/login')
}


const formularioRegistro = (req, res) => {
    res.render('auth/registro', {
        pagina: 'Crear cuenta',
        csrfToken: req.csrfToken()
    })
}

const registrar = async (req, res) => {
    console.log(req.body)
    await check('nombre').notEmpty().withMessage('El nombre no puede ir vacío').run(req);
    await check('email')
        .notEmpty().withMessage('El correo electrónico es un campo obligatorio')
        .isEmail().withMessage('El correo electrónico no tiene el formato correcto')
        .run(req);
    await check('password')
        .notEmpty().withMessage('La contraseña es un campo obligatorio')
        .isLength({ min: 8 }).withMessage('El Password debe ser de al menos 8 caracteres')
        .run(req);
    await check('repetir_password')
        .equals(req.body.password).withMessage('La contraseña debe coincidir con la anterior')
        .run(req);

    // Validación de la fecha de nacimiento
    await check('fecha_nacimiento')
        .notEmpty().withMessage('La fecha de nacimiento es obligatoria')
        .custom((value) => {
            const age = moment().diff(moment(value, 'YYYY-MM-DD'), 'years');
            if (age < 18) {
                throw new Error('Debes ser mayor de 18 años para registrarte');
            }
            return true;
        })
        .run(req);

    // Validación del alias
    await check('alias')
        .notEmpty().withMessage('El alias es un campo obligatorio')
        .isLength({ min: 3 }).withMessage('El alias debe tener al menos 3 caracteres')
        .run(req);

    let resultado = validationResult(req)

    //verificar que el resultado este vacio
    if (!resultado.isEmpty()) {
        return res.render('auth/registro', {
            pagina: 'Crear cuenta',
            csrfToken: req.csrfToken(),
            errores: resultado.array(),
            usuario: {
                nombre: req.body.nombre,
                email: req.body.email,
                alias: req.body.alias,
                fecha_nacimiento: req.body.fecha_nacimiento
            }
        })
    }

    //Extraer los datos
    const { nombre, email, password, foto = '', alias, fecha_nacimiento } = req.body

    //verificar que el usuario no este duplicado
    const existeUsuario = await Usuario.findOne({ where: { email } })
    if (existeUsuario) {
        return res.render('auth/registro', {
            pagina: 'Crear cuenta',
            csrfToken: req.csrfToken(),
            errores: [{ msg: 'El usuario ya está registrado' }],
            usuario: {
                nombre: req.body.nombre,
                email: req.body.email,
                alias: req.body.alias,
                fecha_nacimiento: req.body.fecha_nacimiento
            }
        })
    }

    //Almacenar un usuario
    const usuario = await Usuario.create({
        nombre,
        email,
        password,
        foto,
        alias,
        fechaDeNacimiento: fecha_nacimiento,
        token: generateID()
    })

    //Enviar email de confirmación
    emailRegistro({
        nombre: usuario.nombre,
        email: usuario.email,
        token: usuario.token
    })

    res.render('auth/agregar-foto', {
        pagina: `Agregar Imagen: ${usuario.nombre}`,
        csrfToken: req.csrfToken(),
        usuario
    })
}

//Funcion que comprueba una cuenta
const confirmar = async (req, res) => {
    const { token } = req.params;

    //verificar si el token es valido

    const usuario = await Usuario.findOne({ where: { token } })
    if (!usuario) {
        return res.render('auth/confirmar-cuenta', {
            pagina: 'Error al confirmar tu cuenta',
            mensaje: 'Hubo un error al confirmar tu cuenta, intenta de nuevo',
            error: true
        })
    }

    //confirmar la cuenta
    usuario.token = null;
    usuario.confirmado = true;
    await usuario.save();

    res.render('auth/confirmar-cuenta', {
        pagina: 'Cuenta confirmada',
        mensaje: 'La cuenta se confirmo correctamente'
    })


    console.log(usuario)
}

const formularioOlvidePassword = (req, res) => {
    res.render('auth/olvide-password', {
        pagina: 'Recupera tu acceso a Bienes Raíces',
        csrfToken: req.csrfToken()
    })
}

const resetPassword = async (req, res) => {
    //validación
    await check('email').isEmail().withMessage('Eso no parece un email').run(req)

    let resultado = validationResult(req)
    //verificar que el resultado este vacio
    if (!resultado.isEmpty()) {
        return res.render('auth/olvide-password', {
            pagina: 'Recupera tu acceso a Bienes Raíces',
            csrfToken: req.csrfToken(),
            errores: resultado.array()
        })
    }

    //Buscar al usuario
    const { email } = req.body
    const usuario = await Usuario.findOne({ where: { email } })

    if (!usuario) {
        return res.render('auth/olvide-password', {
            pagina: 'Recupera tu acceso a Bienes Raíces',
            csrfToken: req.csrfToken(),
            errores: [{ msg: 'El email no pertenece a ningún usuario' }]
        })
    }

    //Generar un token y enviar el email
    usuario.token = generateID();
    await usuario.save();

    //Enviar un email
    emailOlvidePassword({
        email: usuario.email,
        nombre: usuario.nombre,
        token: usuario.token
    })
    //Renderizar un mensaje
    res.render('templates/message', {
        pagina: 'Restablece tu password',
        mensaje: 'Hemos enviado un email con las instrucciones'
    })

}

const comprobarToken = async (req, res) => {
    const { token } = req.params;
    const usuario = await Usuario.findOne({ where: { token } })
    if (!usuario) {
        return res.render('auth/confirmar-cuenta', {
            pagina: 'Restablece tu password',
            mensaje: 'Hubo un error al validar tu informsción, intenta de nuevo',
            error: true
        })
    }

    //mostrar formulario para modificar el password
    res.render('auth/reset-password', {
        pagina: 'Restablece tu password',
        csrfToken: req.csrfToken()
    })

}

const nuevoPassword = async (req, res) => {
    //validar el password
    await check('password').isLength({ min: 6 }).withMessage('El password debe ser de almenos 6 caracteres').run(req)

    let resultado = validationResult(req)

    //verificar que el resultado este vacio
    if (!resultado.isEmpty()) {
        return res.render('auth/reset-password', {
            pagina: 'Restablece tu password',
            csrfToken: req.csrfToken(),
            errores: resultado.array()
        })
    }

    const { token } = req.params
    const { password } = req.body;

    //identificar quien hace el cambio
    const usuario = await Usuario.findOne({ where: { token } })

    //hashear el nuevo password
    const salt = await bcrypt.genSalt(10)
    usuario.password = await bcrypt.hash(password, salt);
    usuario.token = null;
    await usuario.save();

    res.render('auth/confirmar-cuenta', {
        pagina: 'Password Restablecido',
        mensaje: 'El password se guardo correctamente'
    })


}


const subirFotoPerfil = async (req, res) => {

    const { id } = req.params
    //Validar que la propiedad exista

    const usuario = await Usuario.findByPk(id)

    if (!usuario) {
        return res.render('auth/registro', {
            pagina: 'Crear cuenta',
            csrfToken: req.csrfToken(),
            errores: [{ msg: 'El usuario no esta Registrado' }],
            usuario: {
                nombre: req.body.nombre,
                email: req.body.email
            }
        })
    }   
}

const almacenarFotoPerfil = async (req, res) => {
    const { id } = req.params;

    try {
        // Validar usuario
        const usuario = await Usuario.findByPk(id);
        if (!usuario) {
            console.log('Usuario no encontrado');
            return res.render('auth/registro', {
                pagina: 'Crear cuenta',
                csrfToken: req.csrfToken(),
                errores: [{ msg: 'El usuario no está registrado' }],
                usuario: {
                    nombre: req.body.nombre,
                    email: req.body.email,
                },
            });
        }

        // Depuración para verificar req.file
        console.log('Archivo recibido:', req.file);

        if (!req.file) {
            throw new Error('No se subió ninguna imagen');
        }

        // Almacenar la imagen del usuario
        usuario.foto = req.file.filename;
        await usuario.save();

        console.log('Imagen almacenada con éxito, redirigiendo...');

        // Después de guardar la foto y procesar la lógica
        return res.redirect('/auth/mensaje');

    } catch (error) {
        console.error('Error en el controlador:', error);

        return res.render('auth/registro', {
            pagina: 'Crear cuenta',
            csrfToken: req.csrfToken(),
            errores: [{ msg: 'La subida de la imagen falló, intenta de nuevo.' }],
            usuario: {
                nombre: req.body.nombre,
                email: req.body.email,
            },
        });
    }
};


 const mostrarUsuario = async (req, res) => {
    const { id } = req.params;

    // Buscar el usuario por ID
    const usuario = await Usuario.findByPk(id, {
        attributes: ['nombre', 'email', 'alias', 'fechaDeNacimiento','foto']
    });

    if (!usuario) {
        return res.redirect('/404');
    }

    res.render('usuario/perfil', {
        usuario,
        pagina: `Perfil de ${usuario.nombre}`,
        csrfToken: req.csrfToken()
    });
};

// Mostrar el formulario para editar perfil
const mostrarFormularioEditar = async (req, res) => {
    const { id } = req.params;
    try {
        const usuario = await Usuario.findByPk(id);
        if (!usuario) {
            return res.redirect('/404'); // Redirigir si no se encuentra el usuario
        }
        res.render('usuario/editar', {
            usuario, // Pasamos los datos del usuario a la vista
            pagina: 'Editar Perfil', // Título de la página
            csrfToken: req.csrfToken(), // Asegúrate de pasar el token CSRF
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al cargar el formulario de edición');
    }
};

// Actualizar el perfil del usuario
const actualizarPerfil = async (req, res) => {
    const { id } = req.params;
    const { alias, fechaNacimiento } = req.body;
    try {
        // Buscar al usuario por su ID
        const usuario = await Usuario.findByPk(id);
        if (!usuario) {
            return res.redirect('/404'); // Redirigir si no se encuentra el usuario
        }
        // Actualizar los datos del usuario
        usuario.alias = alias || usuario.alias;
        usuario.fechaNacimiento = fechaNacimiento || usuario.fechaNacimiento;
        if (req.file) {
            usuario.foto = req.file.filename;
        }
        // Guardar los cambios
        await usuario.save();
        res.redirect(`/usuario/${id}`); // Redirigir a la página del perfil actualizado
    } catch (error) {
        console.error(error);
        res.status(500).send('Error al actualizar el perfil');
    }
};

export {
    formularioLogin,
    cerrarSesion,
    mostrarUsuario,
    formularioRegistro,
    autenticar,
    registrar,
    confirmar,
    formularioOlvidePassword,
    resetPassword,
    comprobarToken,
    nuevoPassword,
    subirFotoPerfil,
    almacenarFotoPerfil,
    mostrarFormularioEditar,
    actualizarPerfil
}