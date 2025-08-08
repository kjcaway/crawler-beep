require('dotenv').config();
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

const TARGET = 'http://test.com'; // 테스트용
const TARGET_URL = `${TARGET}/goods/event_sale.php?sno=23`;

puppeteer.use(StealthPlugin());

async function main() {
  console.log('스크립트를 시작합니다.');

  let targetProducts = [];
  try {
    const data = fs.readFileSync('input.json', 'utf8');
    targetProducts = JSON.parse(data);
    console.log('조회할 상품 목록:', targetProducts);
  } catch (err) {
    console.error('input.json 파일을 읽는 중 오류가 발생했습니다.', err);
    return;
  }

  const username = process.env.USERNAME;
  const password = process.env.PASSWORD;

  if (!username || !password) {
    console.error('.env 파일에 USERNAME과 PASSWORD를 설정해주세요.');
    return;
  }

  console.log('로그인 정보를 성공적으로 불러왔습니다.');

  const browser = await puppeteer.launch({
    headless: false, // headless: false 옵션으로 브라우저 동작을 직접 확인할 수 있습니다.
    args: [`--unsafely-treat-insecure-origin-as-secure=${TARGET}`],
  });
  const page = await browser.newPage();

  console.log(`${TARGET_URL} 페이지로 이동합니다...`);
  await page.goto(TARGET_URL);

  // 페이지 타이틀 가져오기
  const pageTitle = await page.title();
  console.log(`페이지 타이틀: ${pageTitle}`);

  // '더보기' 버튼을 계속 클릭하여 모든 상품을 로드합니다.
  const moreButtonSelector = 'button.btn_goods_view_down_more';
  while (true) {
    try {
      const moreButton = await page.$(moreButtonSelector);
      if (moreButton) {
        console.log('"더보기" 버튼을 클릭합니다.');
        await page.click(moreButtonSelector);
        // 새로운 상품이 로드될 때까지 잠시 기다립니다.
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        console.log('더 이상 "더보기" 버튼이 없습니다. 상품 수집을 시작합니다.');
        break;
      }
    } catch (e) {
      console.log('"더보기" 버튼을 찾을 수 없습니다. 상품 수집을 시작합니다.');
      break;
    }
  }


  console.log('페이지에서 상품 정보를 추출합니다.');

  // "item_gallery_type" 클래스를 가진 div 내의 모든 상품명을 찾습니다.
  const products = await page.$$eval('div.item_gallery_type ul li', (items) =>
    items.map((item) => {
      const name = item.querySelector('strong.item_name').textContent.trim();
      const isSoldOut = item.classList.contains('item_soldout');
      return { name, isSoldOut };
    })
  );

  const filteredProducts = products.filter(product => 
    targetProducts.some(target => product.name.includes(target))
  );

  if (filteredProducts.length > 0) {
    console.log('--- 조회된 상품 목록 ---');
    filteredProducts.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name} - ${product.isSoldOut ? '품절' : '판매중'}`);
    });
    console.log('--- 상품 목록 끝 ---');
  } else {
    console.log('input.json에 명시된 상품을 찾지 못했습니다.');
  }

  await browser.close();
  console.log('스크립트가 종료되었습니다.');
}

main();
