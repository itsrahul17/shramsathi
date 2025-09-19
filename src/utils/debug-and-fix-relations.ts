// Advanced debug and fix utility for contractor-worker relations
export const debugAndFixRelations = () => {
  console.log('🔍 ADVANCED DEBUG: Contractor-Worker Relations');
  
  // Get all localStorage keys
  const allKeys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('shramsathi_temp_')) {
      allKeys.push(key);
    }
  }
  
  // Find all users
  const userKeys = allKeys.filter(key => key.includes('user_'));
  const users = [];
  let currentContractor = null;
  let currentWorker = null;
  
  userKeys.forEach(key => {
    const data = localStorage.getItem(key);
    if (data) {
      try {
        const user = JSON.parse(data);
        users.push(user);
        
        if (user.role === 'contractor') {
          console.log('👷 Contractor found:', {
            id: user.id,
            name: user.name,
            contractorId: user.contractorId || 'NOT SET'
          });
          if (user.contractorId === 'EQ2HS2') {
            currentContractor = user;
          }
        }
        
        if (user.role === 'worker' && user.contractorCode === 'EQ2HS2') {
          console.log('👤 Worker with contractor code EQ2HS2:', {
            id: user.id,
            name: user.name,
            contractorCode: user.contractorCode
          });
          currentWorker = user;
        }
      } catch (error) {
        console.error('❌ Error parsing user:', error);
      }
    }
  });
  
  console.log('📊 Summary:');
  console.log('- Total users:', users.length);
  console.log('- Contractors:', users.filter(u => u.role === 'contractor').length);
  console.log('- Workers:', users.filter(u => u.role === 'worker').length);
  console.log('- Current contractor:', currentContractor ? currentContractor.name : 'NOT FOUND');
  console.log('- Current worker:', currentWorker ? currentWorker.name : 'NOT FOUND');
  
  // Check relations
  const relationKeys = allKeys.filter(key => key.includes('relation_'));
  console.log('🔗 Current relations:', relationKeys.length);
  
  relationKeys.forEach(key => {
    const data = localStorage.getItem(key);
    if (data) {
      try {
        const relation = JSON.parse(data);
        console.log('🤝 Relation:', relation);
      } catch (error) {
        console.error('❌ Error parsing relation:', error);
      }
    }
  });
  
  // If we have contractor and worker but no relation, create it
  if (currentContractor && currentWorker && relationKeys.length === 0) {
    console.log('🔧 FIXING: Creating missing relation...');
    
    const relationKey = `shramsathi_temp_relation_${currentContractor.id}_${currentWorker.id}`;
    const relationData = {
      id: relationKey,
      contractorId: currentContractor.id,
      workerId: currentWorker.id,
      contractorCode: 'EQ2HS2',
      createdAt: new Date().toISOString()
    };
    
    localStorage.setItem(relationKey, JSON.stringify(relationData));
    console.log('✅ Relation created:', relationData);
    console.log('🔄 Please refresh the contractor dashboard to see the worker');
    
    return true;
  } else if (relationKeys.length > 0) {
    console.log('✅ Relations already exist');
    return true;
  } else {
    console.log('❌ Missing contractor or worker data');
    return false;
  }
};

// Function to clean and recreate relations
export const recreateRelations = () => {
  console.log('🧹 Cleaning and recreating relations...');
  
  // Remove all existing relations
  const allKeys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.includes('relation_')) {
      allKeys.push(key);
    }
  }
  
  allKeys.forEach(key => {
    localStorage.removeItem(key);
    console.log('🗑️ Removed relation:', key);
  });
  
  // Recreate relations based on worker contractor codes
  const userKeys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('shramsathi_temp_user_')) {
      userKeys.push(key);
    }
  }
  
  const users = [];
  userKeys.forEach(key => {
    const data = localStorage.getItem(key);
    if (data) {
      try {
        const user = JSON.parse(data);
        users.push(user);
      } catch (error) {
        console.error('Error parsing user:', error);
      }
    }
  });
  
  const contractors = users.filter(u => u.role === 'contractor');
  const workers = users.filter(u => u.role === 'worker' && u.contractorCode);
  
  console.log('👷 Found contractors:', contractors.length);
  console.log('👤 Found workers with contractor codes:', workers.length);
  
  let relationsCreated = 0;
  
  workers.forEach(worker => {
    const contractor = contractors.find(c => c.contractorId === worker.contractorCode);
    if (contractor) {
      const relationKey = `shramsathi_temp_relation_${contractor.id}_${worker.id}`;
      const relationData = {
        id: relationKey,
        contractorId: contractor.id,
        workerId: worker.id,
        contractorCode: worker.contractorCode,
        createdAt: new Date().toISOString()
      };
      
      localStorage.setItem(relationKey, JSON.stringify(relationData));
      console.log('✅ Created relation:', {
        contractor: contractor.name,
        worker: worker.name,
        code: worker.contractorCode
      });
      relationsCreated++;
    } else {
      console.log('❌ No contractor found for worker:', worker.name, 'with code:', worker.contractorCode);
    }
  });
  
  console.log(`🎉 Created ${relationsCreated} relations`);
  console.log('🔄 Please refresh the contractor dashboard');
  
  return relationsCreated;
};

// Make functions available globally
if (typeof window !== 'undefined') {
  (window as any).debugAndFixRelations = debugAndFixRelations;
  (window as any).recreateRelations = recreateRelations;
  console.log('🔧 Debug functions available:');
  console.log('- window.debugAndFixRelations()');
  console.log('- window.recreateRelations()');
}