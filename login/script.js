const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const switchToRegister = document.getElementById('switch-to-register');
const switchToLogin = document.getElementById('switch-to-login');
const authSection = document.getElementById('auth');
const formTitle = document.getElementById('form-title');
const WEB_URL = ""
const API_URL = "https://dfe6-2402-e280-3e2f-2be-7419-988b-ac8b-58.ngrok-free.app"

addEventListener("DOMContentLoaded", (d) => {
val = getCookie("loggedin");
if (val === "true"){
    window.location.pathname = WEB_URL + "/dashboard";
}else {

}
});

switchToRegister.addEventListener('click', (e) => {
  e.preventDefault();
  loginForm.style.display = 'none';
  registerForm.style.display = 'flex';
  formTitle.textContent = 'Register';
});

switchToLogin.addEventListener('click', (e) => {
  e.preventDefault();
  loginForm.style.display = 'flex';
  registerForm.style.display = 'none';
  formTitle.textContent = 'Login';
});

loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  emailvalue = document.getElementById("lgn-email").value;
  passwordvalue = document.getElementById("lgn-pass").value;

  fetch(API_URL + '/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json' 
    },
    body: JSON.stringify({email : emailvalue, password : passwordvalue})
  })
  .then( res => {
    if (res.status == 401) {
      alert("Email Or Password Is Incorrect!");
    }
    else if (!res.ok){
      throw new Error("Login Failed");
    }
    else {
      return res;
    }
  })
  .then(res => res.text())
  .then(id => {
    CreateOrUpdateCookie("loggedin","true",1);
    CreateOrUpdateCookie("id",id,1);
    window.location.pathname = WEB_URL + '/dashboard';
  })
  .catch(err => alert(err.message));
});

registerForm.addEventListener('submit', (e) => {  
  e.preventDefault();
  usernamevalue = document.getElementById("name").value;
  emailvalue = document.getElementById("email").value;
  passwordvalue = document.getElementById("pass").value;

  fetch(API_URL + '/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({'username' : usernamevalue, 'email' : emailvalue, 'password' : passwordvalue})
  })
  .then(res => {
    if (!res.ok) {
      throw new Error('Registration Failed - Maybe Email Or Username is Already Registered');
    }
    return res
  })
  .then(res => res.text())
  .then(id => {
      CreateOrUpdateCookie("loggedin","true",1);
      CreateOrUpdateCookie("id",id,1);
      window.location.pathname = WEB_URL + '/dashboard';
    })
  .catch(err => alert(err.message));
});

function getCookie(name) {
  const cookies = document.cookie.split("; ");
  for (let c of cookies) {
    const [key, val] = c.split("=");
    if (key === name) return val;
  }
  return null;
}

function CreateOrUpdateCookie(name, value, days = 7) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString(); // 864e5 = 86400000 ms = 1 day
  document.cookie = `${name}=${value}; expires=${expires}; path=/; Secure`;
}
