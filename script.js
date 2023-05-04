
const API = "https://randomuser.me/api/?nat=us";

function generateUser() {
	fetch(API)
		.then(response => response.json())
		.then(data => {
			const user = data.results[0];
			const userContainer = document.getElementById('user-container');

			userContainer.innerHTML = `
				<h2>${user.name.title} ${user.name.first} ${user.name.last}</h2>
				<p><strong>Pohlaví:</strong> ${user.gender}</p>
				<p><strong>Email:</strong> ${user.email}</p>
				<p><strong>Datum narození:</strong> ${new Date(user.dob.date).toLocaleDateString()}</p>
				<p><strong>Adresa:</strong> ${user.location.street.number} ${user.location.street.name}, ${user.location.city}, ${user.location.country}</p>
				<img src="${user.picture.large}" alt="Uživatel ${user.name.first} ${user.name.last}">
			`;
		})
		.catch(error => {
			console.error('Nepodařilo se získat data uživatele:', error);
		});
}
