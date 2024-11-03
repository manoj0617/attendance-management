// (() => {
//     'use strict'
  
//     // Fetch all the forms we want to apply custom Bootstrap validation styles to
//     const forms = document.querySelectorAll('.needs-validation')
  
//     // Loop over them and prevent submission
//     Array.from(forms).forEach(form => {
//       form.addEventListener('submit', event => {
//         if (!form.checkValidity()) {
//           event.preventDefault()
//           event.stopPropagation()
//         }
  
//         form.classList.add('was-validated')
//       }, false)
//     })
//   });

//   $(document).ready(function() {
//     // Fetch and display attendance records for modification
//     $('#attendanceForm').submit(function(event) {
//         event.preventDefault(); // Prevent default form submission

//         var section = $('#section').val();
//         var date = $('#date').val();
//         var period = $('input.period-checkbox:checked').val();
//         var subject = $('#subject').val();
//         var batch = $('#batch').val();

//         if (period) {
//             $.ajax({
//                 url: '/faculty/fetchAttendanceForModification',
//                 type: 'GET',
//                 data: { section: section, date: date, period: period, subject: subject, batch: batch },
//                 success: function(data) {
//                     displayAttendanceForModification(data.attendanceRecords, data.sectionData);
//                     $('#confirmSaveAttendance').show();
//                 },
//                 error: function(err) {
//                     alert(err.responseJSON.error || 'Failed to fetch attendance records.');
//                 }
//             });
//         } else {
//             alert('Please select a period.');
//         }
//     });

//     // Display attendance for modification
//     function displayAttendanceForModification(attendanceRecords, sectionData) {
//         let attendanceHtml = '';

//         const students = sectionData.students.filter(s => !batch || s.batch == batch);

//         students.forEach(student => {
//             const record = attendanceRecords.find(r => r.student._id.toString() === student.student._id.toString());
//             let isChecked = record ? record.status : false;
//             let isDisabled = !isChecked ? 'disabled' : '';

//             attendanceHtml += `
//                 <div class="student-row">
//                     <span>${student.student.name}</span>
//                     <input type="checkbox" class="attendance-checkbox" name="attendance[${student.student._id}]" value="true" ${isChecked ? 'checked' : ''} ${isDisabled}>
//                 </div>
//             `;
//         });

//         $('#attendanceModificationContainer').html(attendanceHtml);
//         $('#attendanceModificationContainer').show();
//     }

//     // Show attendance records
//     $('#showAttendanceForm').submit(function(event)```javascript
//     $('#showAttendanceForm').submit(function(event) {
//         event.preventDefault(); // Prevent default form submission

//         var section = $('#section').val();
//         var date = $('#date').val();
//         var period = $('input.period-checkbox:checked').val();
//         var subject = $('#subject').val();
//         var batch = $('#batch').val();

//         if (period) {
//             $.ajax({
//                 url: '/faculty/showAttendance',
//                 type: 'GET',
//                 data: { section: section, date: date, period: period, subject: subject, batch: batch },
//                 success: function(data) {
//                     displayAttendance(data.attendanceRecords, data.sectionData);
//                 },
//                 error: function(err) {
//                     alert(err.responseJSON.error || 'Failed to fetch attendance records.');
//                 }
//             });
//         } else {
//             alert('Please select a period.');
//         }
//     });

//     // Display attendance records
//     function displayAttendance(attendanceRecords, sectionData) {
//         let attendanceHtml = '';

//         const students = sectionData.students.filter(s => !batch || s.batch == batch);

//         students.forEach(student => {
//             const record = attendanceRecords.find(r => r.student._id.toString() === student.student._id.toString());
//             let status = record ? (record.status ? 'Present' : 'Absent') : 'No record';

//             attendanceHtml += `
//                 <div class="student-row">
//                     <span>${student.student.name}</span>
//                     <span>Status: ${status}</span>
//                 </div>
//             `;
//         });

//         $('#attendanceDisplayContainer').html(attendanceHtml);
//         $('#attendanceDisplayContainer').show();
//     }

//     // Save modified attendance
//     $(document).on('click', '#confirmSaveAttendance', function() {
//         const section = $('#section').val();
//         const date = $('#date').val();
//         const period = $('input.period-checkbox:checked').val();
//         const subject = $('#subject').val();
//         const batch = $('#batch').val();

//         let modifiedAttendance = {};

//         $('.student-row').each(function() {
//             const studentId = $(this).find('.attendance-checkbox').attr('name').split('[')[1].split(']')[0];
//             const status = $(this).find('.attendance-checkbox').is(':checked') ? 'true' : 'false';

//             modifiedAttendance[studentId] = status;
//         });

//         $.ajax({
//             url: '/faculty/saveModifiedAttendance',
//             type: 'POST',
//             data: {
//                 section: section,
//                 date: date,
//                 period: period,
//                 subject: subject,
//                 batch: batch,
//                 modifiedAttendance: modifiedAttendance
//             },
//             success: function(data) {
//                 alert('Attendance updated successfully!');
//                 window.location.href = '/faculty/showAttendance';
//             },
//             error: function(err) {
//                 alert('Failed to save attendance. Please try again.');
//             }
//         });
//     });
// });

  