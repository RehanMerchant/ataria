import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendOtpEmail = async (toEmail: string, otpCode: string) => {
  const fromEmail = process.env.EMAIL_FROM || 'onboarding@rehan.com';

  try {
    const data = await resend.emails.send({
      from: `Verification <onboarding@${process.env.EMAIL_FROM}>`,
      to: [toEmail],
      subject: 'Your Login Code',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome!</h2>
          <p>Your secure login code is:</p>
          <h1 style="letter-spacing: 5px; color: #333;">${otpCode}</h1>
          <p>This code will expire in 5 minutes. Do not share it with anyone.</p>
        </div>
      `,
    });
    
    return data;
  } catch (error) {
    console.error('Failed to send email:', error);
    throw new Error('Could not send verification email.');
  }
};