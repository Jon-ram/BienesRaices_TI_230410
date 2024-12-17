import nodemailer from 'nodemailer'

const emailRegistro = async (datos) => {
  const transport = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  const { email, nombre, token } = datos

  //Enviar el email
  await transport.sendMail({
    from: 'BienesRaices.com',
    to: email,
    subject: 'Confirma tu cuenta en BienesRaices.com',
    text: 'Confirma tu cuenta en BienesRaices.com',
    html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #333; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px; background-color: #f9f9f9;">
            <h2 style="text-align: center; color: #4CAF50;">¡Bienvenido a Bienes Raíces, ${nombre}!</h2>
            <p style="font-size: 1rem; margin: 15px 0;">
                Gracias por registrarte en nuestra plataforma. Estamos encantados de tenerte con nosotros.
                Por favor, confirma tu cuenta para empezar a disfrutar de todos los beneficios.
            </p>
            <div style="text-align: center; margin: 20px 0;">
                <a href="${process.env.BACKEND_URL}:${process.env.PORT ?? 3000}/auth/confirmar/${token}"
                   style="display: inline-block; padding: 12px 20px; font-size: 1rem; color: #fff; background-color: #4CAF50; text-decoration: none; border-radius: 5px;">
                    Confirmar Cuenta
                </a>
            </div>
            <p style="font-size: 0.9rem; margin: 15px 0; color: #666;">
                Si no creaste esta cuenta, puedes ignorar este correo. Tu información está segura con nosotros.
            </p>
            <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;">
            <footer style="text-align: center; font-size: 0.8rem; color: #999;">
                <img src = "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEgsEBTNgUF_g7NCT48KidfjeCk_H4Sbj-BuI4Xo1Sh2VlmJOZSHG6rCw-aHj56Aqapx4fxsfEQRjdnmMkFTDynhPgLFfjQmZ6wHbaP9mFno8TippsSaoTBI6IWlm162i-fdmb8i3soOSKMk/w1200-h630-p-k-no-nu/1280px-Firma_C%25C3%25A1mpora.svg.png"
                    alt="Firma" style="max-width: 150px; height: auto; border-radius:5px; margin: 10px 0; text-align: center;">
                © 2024 Bienes Raíces. Todos los derechos reservados.
            </footer>
        </div>
    `
  })
}

const emailOlvidePassword = async (datos) => {
  const transport = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  const { email, nombre, token } = datos

  //Enviar el email
  await transport.sendMail({
    from: 'BienesRaices.com',
    to: email,
    subject: 'Restablece tu password en BienesRaices.com',
    text: 'Restablece tu password en BienesRaices.com',
    html: `
       <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #333; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px; background-color: #f9f9f9;">
                <h2 style="text-align: center; color: #4CAF50;">¡Hola, ${nombre}!</h2>
                <p style="font-size: 1rem; margin: 15px 0;">
                    Hemos recibido una solicitud de cambio de contraseña en tu cuenta. Si no fuiste tú, por favor, ignora este mensaje.
                </p>
                <div style="text-align: center; margin: 20px 0;">
                    <a href="${process.env.BACKEND_URL}:${process.env.PORT ?? 3000}/auth/olvide-password/${token}" 
                        style="background-color: #3498DB; color: white; text-decoration: none; padding: 12px 25px; border-radius: 8px; font-size: 18px;">
                        Restablecer Contraseña
                    </a>
                </div>
                <p style="font-size: 0.9rem; margin: 15px 0; color: #666;">
                    Si tuviste algún problema o no solicitaste este cambio, por favor contacta con nuestro soporte.
                </p>
                <hr style="border: none; border-top: 1px solid #eaeaea; margin: 20px 0;">
                <footer style="text-align: center; font-size: 0.8rem; color: #999;">
                    © 2024 Bienes Raíces. Todos los derechos reservados.
                </footer>
        </div>
  `
  })

}

export { emailRegistro, emailOlvidePassword }