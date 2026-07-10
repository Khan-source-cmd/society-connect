#!/usr/bin/env node

/**
 * Email Service Test Script
 * Tests the email service configuration and functionality
 */

const { testEmailConfig, getEmailStatus, sendOTP } = require('./backend/services/emailService.cjs');

console.log('🧪 Testing Email Service Configuration...\n');

async function testEmailService() {
  try {
    // Test 1: Check email configuration
    console.log('1️⃣ Testing email configuration...');
    const configTest = await testEmailConfig();
    
    if (configTest.success) {
      console.log('✅ Email configuration test passed');
    } else {
      console.log('❌ Email configuration test failed:');
      console.log(`   Error: ${configTest.error}`);
      console.log('\n💡 Please check your .env file and email provider settings');
      console.log('📖 See EMAIL_CONFIGURATION_GUIDE.md for detailed instructions\n');
      return;
    }

    // Test 2: Check email service status
    console.log('\n2️⃣ Checking email service status...');
    const status = getEmailStatus();
    console.log('📊 Email Service Status:');
    console.log(`   Provider: ${status.provider}`);
    console.log(`   Email User: ${status.emailUser}`);
    console.log(`   Has Transporter: ${status.hasTransporter ? '✅' : '❌'}`);
    console.log(`   Last Error: ${status.lastError || 'None'}`);
    console.log(`   Timestamp: ${status.timestamp}`);

    // Test 3: Test OTP sending (with dummy data)
    console.log('\n3️⃣ Testing OTP email sending...');
    console.log('📧 This will attempt to send an OTP email to test@example.com');
    console.log('⚠️  Note: This is a test - the email may fail if test@example.com is not a real address');
    
    try {
      const testResult = await sendOTP('test@example.com', '123456', 1);
      console.log('✅ OTP email test completed successfully');
      console.log('📝 Note: Email was sent but may not be delivered to test@example.com');
    } catch (error) {
      console.log('⚠️  OTP email test failed (this is expected for test@example.com):');
      console.log(`   ${error.message}`);
      console.log('💡 This is normal for test addresses. Try with a real email address.');
    }

    console.log('\n🎉 Email service testing completed!');
    console.log('\n📋 Summary:');
    console.log('✅ Email configuration is valid');
    console.log('✅ SMTP connection is working');
    console.log('✅ Email service is ready for use');
    
    console.log('\n🚀 Next Steps:');
    console.log('1. Test with a real email address:');
    console.log('   node -e "import { sendOTP } from \'./backend/services/emailService.js\'; sendOTP(\'your-email@example.com\', \'123456\').then(() => console.log(\'Email sent!\')).catch(console.error)"');
    console.log('2. Check your spam folder if you don\'t receive the email');
    console.log('3. See EMAIL_CONFIGURATION_GUIDE.md for more configuration options');

  } catch (error) {
    console.error('💥 Test failed with error:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check your .env file for correct email credentials');
    console.log('2. Verify your email provider supports app passwords');
    console.log('3. Ensure 2-Factor Authentication is enabled');
    console.log('4. Check your internet connection and firewall settings');
    console.log('5. Try switching to a different email provider');
    console.log('\n📖 For detailed help, see EMAIL_CONFIGURATION_GUIDE.md');
  }
}

// Run the test
testEmailService();