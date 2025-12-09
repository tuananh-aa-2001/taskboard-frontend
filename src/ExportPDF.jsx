 const exportToPDF = ({getTasksByStatus, tasks,username}) => {
    const printWindow = window.open('', '', 'width=800,height=600');
    
    const todoTasks = getTasksByStatus('TODO');
    const inProgressTasks = getTasksByStatus('IN_PROGRESS');
    const doneTasks = getTasksByStatus('DONE');
    
    const formatDate = (dateStr) => {
      if (!dateStr) return 'No due date';
      return new Date(dateStr).toLocaleString();
    };
    
    const getPriorityColor = (priority) => {
      const colors = {
        LOW: '#DBEAFE',
        MEDIUM: '#FEF3C7',
        HIGH: '#FED7AA',
        URGENT: '#FECACA'
      };
      return colors[priority] || '#F3F4F6';
    };
    
    const renderTasksHTML = (tasks, title, borderColor) => {
      if (tasks.length === 0) return `
        <div style="page-break-inside: avoid; margin-bottom: 30px;">
          <h2 style="color: #374151; border-bottom: 4px solid ${borderColor}; padding-bottom: 10px; margin-bottom: 15px;">${title} (0)</h2>
          <p style="color: #9CA3AF; text-align: center; padding: 20px;">No tasks</p>
        </div>
      `;
      
      return `
        <div style="page-break-inside: avoid; margin-bottom: 30px;">
          <h2 style="color: #374151; border-bottom: 4px solid ${borderColor}; padding-bottom: 10px; margin-bottom: 15px;">${title} (${tasks.length})</h2>
          ${tasks.map(task => `
            <div style="background: #F9FAFB; border: 2px solid #E5E7EB; border-radius: 8px; padding: 15px; margin-bottom: 15px; page-break-inside: avoid;">
              <div style="font-weight: 600; font-size: 16px; color: #1F2937; margin-bottom: 8px;">${task.title}</div>
              ${task.description ? `<div style="font-size: 14px; color: #6B7280; margin-bottom: 10px;">${task.description}</div>` : ''}
              
              <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                <span style="background: ${getPriorityColor(task.priority)}; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">
                  ${task.priority}
                </span>
              </div>
              
              ${task.dueDate ? `
                <div style="font-size: 13px; color: #4B5563; margin-bottom: 8px;">
                  <strong>Due:</strong> ${formatDate(task.dueDate)}
                </div>
              ` : ''}
              
              ${task.assignedTo ? `
                <div style="font-size: 13px; color: #4B5563; margin-bottom: 8px;">
                  <strong>Assigned to:</strong> ${task.assignedTo}
                </div>
              ` : ''}
              
              ${task.createdBy ? `
                <div style="font-size: 12px; color: #9CA3AF;">
                  Created by: ${task.createdBy}
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      `;
    };
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Task Board Export - ${new Date().toLocaleDateString()}</title>
          <style>
            @media print {
              body { margin: 0; }
              @page { margin: 1cm; }
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
              padding: 20px;
              background: white;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 3px solid #7C3AED;
            }
            .header h1 {
              color: #7C3AED;
              margin: 0 0 10px 0;
              font-size: 28px;
            }
            .header p {
              color: #6B7280;
              margin: 5px 0;
              font-size: 14px;
            }
            .summary {
              background: #F3F4F6;
              padding: 15px;
              border-radius: 8px;
              margin-bottom: 30px;
              display: flex;
              justify-content: space-around;
              text-align: center;
            }
            .summary-item {
              flex: 1;
            }
            .summary-item .number {
              font-size: 32px;
              font-weight: bold;
              color: #7C3AED;
            }
            .summary-item .label {
              font-size: 14px;
              color: #6B7280;
              margin-top: 5px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🎯 Task Board Export</h1>
            <p><strong>Exported on:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Exported by:</strong> ${username}</p>
          </div>
          
          <div class="summary">
            <div class="summary-item">
              <div class="number">${todoTasks.length}</div>
              <div class="label">To Do</div>
            </div>
            <div class="summary-item">
              <div class="number">${inProgressTasks.length}</div>
              <div class="label">In Progress</div>
            </div>
            <div class="summary-item">
              <div class="number">${doneTasks.length}</div>
              <div class="label">Done</div>
            </div>
            <div class="summary-item">
              <div class="number">${tasks.length}</div>
              <div class="label">Total Tasks</div>
            </div>
          </div>
          
          ${renderTasksHTML(todoTasks, '📋 To Do', '#EAB308')}
          ${renderTasksHTML(inProgressTasks, '⚡ In Progress', '#3B82F6')}
          ${renderTasksHTML(doneTasks, '✅ Done', '#10B981')}
          
          <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #E5E7EB; text-align: center; color: #9CA3AF; font-size: 12px;">
            Generated by Task Board Application
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    
    // Wait for content to load, then print
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  export default exportToPDF;