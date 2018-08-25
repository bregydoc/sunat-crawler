const puppeteer = require('puppeteer');
const { spawn } = require('child_process');

async function getInfoWithDNI(dni) {
	return new Promise(async (resolve, reject) => {
		let info;

		const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
		const page = await browser.newPage();
		await page.setViewport({ width: 1280, height: 721 });
		await page.goto(
			'https://e-consultaruc.sunat.gob.pe/cl-ti-itmrconsruc/frameCriterioBusqueda.jsp'
		);
		console.log('goto');
		const tbodies = await page.$$('tbody');
		const tbody = tbodies[tbodies.length - 1];
		const trs = await tbody.$$('tr');
		const tr = trs[trs.length - 2];
		const tds = await tr.$$('td');
		const td = tds[0];

		const dniMode = await td.$('input[type=radio]');
		await dniMode.click();

		const dniInput = await page.$('input[class="form-text"]');
		await dniInput.type(dni);

		const captcha = await page.$('img[name="imagen"]');
		console.log('full captcha');
		await captcha.screenshot({ path: 'captcha.png' });

		// convert captcha.jpeg -colorspace Gray -auto-threshold Triangle  captcha-1.jpeg
		// tesseract -psm 8 captcha-1.jpeg -

		const convert = spawn('convert', [
			'captcha.png',
			'-modulate',
			'100,30,80',
			'-colorspace',
			'Gray',
			'+contrast',
			'+contrast',
			'-enhance',
			'-auto-threshold',
			'OTSU',
			'-background',
			'black',
			'-blur',
			'0.1',
			'captcha-1.png'
		]);
		console.log('converting and fixing captcha');
		convert.on('exit', code => {
			console.log('finished converting');

			const tesseract = spawn('tesseract', [
				'--psm',
				'8',
				'-c',
				'tessedit_char_whitelist=ABCDEFGHIJKLMNÑOPQRSTUVWXYZ',
				'captcha-1.png',
				'-'
			]);
			console.log('scanning captcha');
			tesseract.stdout.on('data', async data => {
				solvedCaptcha = data
					.toString()
					.trim()
					.replace('\n', '')
					.toUpperCase()
					.substring(0, 4);
				console.log('captcha founded: ' + '"' + solvedCaptcha + '"');
				// console.log(solvedCaptcha);

				const captchaInput = await page.$('input[name="codigo"]');
				await captchaInput.type(solvedCaptcha);

				const processButton = await page.$(
					'input[class="form-button"]'
				);

				await processButton.click();

				await page.screenshot({ path: 'example.png' });

				let pages = await browser.pages();
				console.log('Total pages', pages.length);

				const table = await pages[pages.length - 1].$(
					'table[cellspacing="1"]'
				);

				const trs = await (await table.$('tbody')).$$('tr');

				const tr = await trs[trs.length - 1];

				const userInfo = await tr.$$eval('td', tds => {
					console.log(tds.length);
					var values = [];
					for (let i in tds) {
						console.log(tds[i].value);
						values.push(
							tds[i].textContent.trim().replace('\n\t', '')
						);
					}
					return values;
				});

				info = {
					ruc: userInfo[0],
					name: userInfo[1],
					city: userInfo[2]
				};
				resolve(info);
				await browser.close();
			});
			tesseract.stderr.on('data', data => {
				// console.log(data.toString());
			});
		});

		convert.stderr.on('data', data => {
			console.log(data.toString());
		});
	});
}

(async () => {
	const dni = process.argv[process.argv.length - 1];
	const info = await getInfoWithDNI(dni);
	console.log(JSON.stringify(info));
})();
