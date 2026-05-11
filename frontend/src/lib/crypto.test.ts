/**
 * Crypto utilities test
 * Quick verification that key generation and encryption work
 */

import * as crypto from '../lib/crypto';

export async function testCryptoFunctions(): Promise<void> {
  console.log('🔐 Testing Crypto Functions...\n');

  try {
    // Test 1: Key generation
    console.log('1️⃣  Testing key pair generation...');
    const { publicKey, privateKey } = await crypto.generateKeyPair();
    console.log('✅ Key pair generated successfully\n');

    // Test 2: Export public key
    console.log('2️⃣  Testing public key export...');
    const publicKeyJwk = await crypto.exportPublicKeyJwk(publicKey);
    console.log('✅ Public key exported to JWK format');
    console.log('   Key type:', publicKeyJwk.kty);
    console.log('   Curve:', publicKeyJwk.crv, '\n');

    // Test 3: Password hashing
    console.log('3️⃣  Testing password hashing...');
    const testPassword = 'testPassword123';
    const { hash: passwordHash, salt: passwordSalt } = await crypto.hashPassword(testPassword);
    console.log('✅ Password hashed successfully');
    console.log('   Hash length:', passwordHash.length);
    console.log('   Salt length:', passwordSalt.length, '\n');

    // Test 4: Key derivation
    console.log('4️⃣  Testing key derivation from password...');
    const derivedKeyResult = await crypto.deriveKeyFromPassword(testPassword);
    console.log('✅ Key derived successfully from password');
    console.log('   Salt length:', derivedKeyResult.salt.length, '\n');

    // Test 5: Private key encryption
    console.log('5️⃣  Testing private key encryption...');
    const encrypted = await crypto.encryptPrivateKey(publicKey, privateKey, testPassword);
    console.log('✅ Private key encrypted successfully');
    console.log('   Encrypted length:', encrypted.encryptedPrivateKey.length);
    console.log('   IV length:', encrypted.privateKeyIv.length);
    console.log('   KDF Salt length:', encrypted.kdfSalt.length, '\n');

    // Test 6: Private key decryption
    console.log('6️⃣  Testing private key decryption...');
    const decryptedPrivateKey = await crypto.decryptPrivateKey(
      encrypted.encryptedPrivateKey,
      testPassword,
      encrypted.kdfSalt,
      encrypted.privateKeyIv
    );
    console.log('✅ Private key decrypted successfully');
    console.log('   Algorithm:', decryptedPrivateKey.algorithm);
    console.log('   Type:', decryptedPrivateKey.type, '\n');

    // Test 7: Full registration flow
    console.log('7️⃣  Testing full registration flow...');
    const registration = await crypto.exportKeyMaterialForRegistration(publicKey, privateKey, testPassword);
    console.log('✅ Registration materials exported successfully');
    console.log('   Public Key JWK type:', registration.publicKeyJwk.kty);
    console.log('   Password hash length:', registration.passwordHash.hash.length);
    console.log('   Encrypted private key length:', registration.encryptedPrivateKey.encryptedPrivateKey.length, '\n');

    console.log('✨ All crypto tests passed!\n');
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Only run tests if this is imported as a test file
export default testCryptoFunctions;
