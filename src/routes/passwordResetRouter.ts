import express from 'express';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import {prisma} from '../../prisma';


const router = express.Router();

router.post('/password-reset-link', async (req, res) => {
  try {
  const { email } = req.body;
  console.log(email)

  // todo: write your code here
  // 1. verify if email is in database

  const ifMail = await prisma.user.findUnique({ where: { email } })

  console.log(ifMail)

  
  // Validate the email (make sure it's registered, etc.)
  if (!ifMail) {
    return res.status(400).send({ error: 'Email not found in the database.' });
  }
  console.log("password-reset-link3")
  const timestamp = Date.now();
  const currentDate = new Date(timestamp);

  console.log(email, currentDate.toLocaleString());

  // Create a reset token and expiry date for the user

  const token = crypto.randomBytes(20).toString('hex');
  const resetLink = process.env.FRONTEND_URL + `reset-password/${token}`;
  
  await prisma.user.update({
    where: { email: email },
    data: {
      resetToken: token,
      resetTokenExpiry: Date.now() + 3600000, // 1 hour from now
    },
  });

  // Create a transporter object using the default SMTP transport
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL,
      pass: process.env.PASSWORD
    }
  });

  // Email content
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Password Reset',
    text: `Click the link below to reset your password:\n\n${resetLink}\n\nIf you did not request a password reset, please ignore this email.`
  };

    await transporter.sendMail(mailOptions);
    res.status(200).send({ message: 'Reset email sent successfully.' });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).send({ error: 'Failed to send reset email.' });
  }
});


router.post('/password-confirm', async (req, res) => {

  // 1. Find the user by the token
  // 2. Verify that the token hasn't expired
  // 3. Hash the new password
  // 4. Update the user's password in the database
  // 5. Invalidate the token so it can't be used again
  // 6. Send a response to the frontend
  const { token, password } = req.body;
   console.log(token, password);
  
  // 1. Find the user by the token
  const user = await prisma.user.findUnique({
    where:{
      resetToken: token
    }
  });
  // 2. Verify that the token hasn't expired (assuming you have an expiry date in your DB)
  // If you have a resetTokenExpiry field in your User model:
  const time = Date.now();
  if(user?.resetTokenExpiry == null){
    return res.status(400).send({ error: 'Token does not exist.' });
  }
  else{
    if (user.resetTokenExpiry < time) {
      return res.status(400).send({ error: 'Token has expired.' });
    }
  }

  // 3. Hash the new password

  /*Tried to create hashed password, but type script variable handling preventing this
  const bcrypt = require('bcrypt');
  const hashedPassword = await bcrypt.hash(password, 10);*/

  // 4. Update the user's password in the database
  await prisma.user.update({
    where: {
      id: user.id,
    },
    data: {
      password: password,
      resetToken: null,
      resetTokenExpiry: null,
    },
  });

  // 6. Send a response to the frontend
  try{
    res.status(200).send({ message: 'Password has been changed.' });
} 
  catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).send({ error: 'Failed to change password' });
}

});


export default router;
