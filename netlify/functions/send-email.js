exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Parse the request body
    const { to, subject, message, sender_name = 'SGS A Scouts' } = JSON.parse(event.body);

    // Validate required fields
    if (!to || !subject || !message) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required fields: to, subject, message' })
      };
    }

    // MailerSend API call
    const response = await fetch('https://api.mailersend.com/v1/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MAILERSEND_API_KEY}`,
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify({
        from: {
          email: process.env.FROM_EMAIL || 'noreply@sgsascouts.ca',
          name: sender_name
        },
        to: [
          {
            email: to
          }
        ],
        subject: subject,
        text: message,
        html: `<div style="font-family: Arial, sans-serif;">
          <h3>${subject}</h3>
          <p>${message.replace(/\n/g, '<br>')}</p>
          <hr>
          <p style="color: #666; font-size: 12px;">
            This email was sent from SGS A Scouts
          </p>
        </div>`
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('MailerSend API error:', errorData);
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: 'Failed to send email', details: errorData })
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({ success: true, message: 'Email sent successfully' })
    };

  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error', details: error.message })
    };
  }
};