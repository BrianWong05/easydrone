const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'dronesoccer',
  password: process.env.DB_PASSWORD || 'dronesoccer123',
  database: process.env.DB_NAME || 'drone_soccer',
  charset: 'utf8mb4',
  collation: 'utf8mb4_unicode_ci',
  timezone: '+08:00',
  connectionLimit: 10,
  queueLimit: 0,
  waitForConnections: true,
  typeCast: function (field, next) {
    if (field.type === 'VAR_STRING' || field.type === 'STRING') {
      return field.string();
    }
    return next();
  }
};

// 創建連接池
const pool = mysql.createPool(dbConfig);

// 測試數據庫連接（帶重試機制）
const testConnection = async (retries = 5, delay = 3000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const connection = await pool.getConnection();
      
      // 設置連接字符集
      await connection.execute('SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci');
      await connection.execute('SET CHARACTER SET utf8mb4');
      await connection.execute('SET character_set_connection=utf8mb4');
      
      console.log('✅ 數據庫連接成功，字符集已設置為 utf8mb4');
      
      // 檢查並修復age字段
      await checkAndFixAgeField(connection);
      
      connection.release();
      return true;
    } catch (error) {
      console.log(`❌ 數據庫連接失敗 (嘗試 ${i + 1}/${retries}): ${error.message}`);
      if (i < retries - 1) {
        console.log(`⏳ ${delay/1000}秒後重試...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  console.error('❌ 數據庫連接最終失敗，已達到最大重試次數');
  return false;
};

// 檢查並修復age字段
const checkAndFixAgeField = async (connection) => {
  try {
    console.log('🔍 檢查athletes表結構...');
    
    // 檢查age字段是否存在
    const [columns] = await connection.execute("SHOW COLUMNS FROM athletes WHERE Field = 'age'");
    
    if (columns.length === 0) {
      console.log('🔧 age字段不存在，正在添加...');
      await connection.execute('ALTER TABLE athletes ADD COLUMN age INT NOT NULL DEFAULT 25');
      console.log('✅ age字段已添加');
    } else {
      console.log('📊 age字段存在，檢查配置...');
      
      // 檢查是否有null age的運動員
      const [nullAges] = await connection.execute('SELECT COUNT(*) as count FROM athletes WHERE age IS NULL');
      
      if (nullAges[0].count > 0) {
        console.log(`🔧 發現 ${nullAges[0].count} 個運動員的年齡為空，正在修復...`);
        
        // 更新null ages
        await connection.execute('UPDATE athletes SET age = 25 WHERE age IS NULL AND position = "attacker"');
        await connection.execute('UPDATE athletes SET age = 23 WHERE age IS NULL AND position = "defender"');
        await connection.execute('UPDATE athletes SET age = 22 WHERE age IS NULL AND position = "substitute"');
        
        console.log('✅ 已修復空年齡數據');
      }
      
      // 檢查age字段是否為NOT NULL
      if (columns[0] && columns[0].Null === 'YES') {
        console.log('🔧 正在將age字段設置為NOT NULL...');
        await connection.execute('ALTER TABLE athletes MODIFY COLUMN age INT NOT NULL');
        console.log('✅ age字段已設置為NOT NULL');
      }
    }
    
    // 驗證最終結構
    const [finalColumns] = await connection.execute("SHOW COLUMNS FROM athletes WHERE Field = 'age'");
    if (finalColumns[0]) {
      console.log(`✅ age字段最終狀態: ${finalColumns[0].Type} ${finalColumns[0].Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
    }
    
  } catch (error) {
    console.error('❌ age字段檢查/修復過程中出現錯誤:', error.message);
    console.error('❌ 錯誤詳情:', error);
  }
};

// 執行查詢的輔助函數
const query = async (sql, params = []) => {
  const connection = await pool.getConnection();
  try {
    // 確保每個連接都使用正確的字符集
    await connection.execute('SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci');
    
    console.log('執行SQL:', sql);
    console.log('參數:', params);
    console.log('參數類型:', params.map(p => typeof p));
    
    // 嘗試使用 execute，如果失敗則使用 query
    try {
      const [rows] = await connection.execute(sql, params);
      return rows;
    } catch (executeError) {
      console.log('execute 失敗，嘗試使用 query 方法:', executeError.message);
      
      // 手動替換參數以避免參數綁定問題
      let finalSql = sql;
      params.forEach((param, index) => {
        const placeholder = '?';
        const value = typeof param === 'string' ? `'${param.replace(/'/g, "''")}'` : param;
        finalSql = finalSql.replace(placeholder, value);
      });
      
      console.log('最終SQL:', finalSql);
      const [rows] = await connection.query(finalSql);
      return rows;
    }
  } catch (error) {
    console.error('數據庫查詢錯誤:', error);
    console.error('SQL:', sql);
    console.error('參數:', params);
    throw error;
  } finally {
    connection.release();
  }
};

// 執行事務的輔助函數
const transaction = async (callback) => {
  if (typeof callback !== 'function') {
    throw new Error('Transaction requires a callback function');
  }
  
  const connection = await pool.getConnection();
  try {
    // 確保每個連接都使用正確的字符集
    await connection.execute('SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci');
    
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// 不在模塊加載時立即測試連接，而是在服務器啟動時測試

module.exports = {
  pool,
  query,
  transaction,
  testConnection
};