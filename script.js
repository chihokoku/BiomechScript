import { initLength } from "./components/z_length.js";
import { clipping } from "./components/clipping.js";

window.addEventListener("DOMContentLoaded", init);

function init() {
  // canvas1で使用する変数を展開
  const {
    scene1,
    renderer1,
    camera1,
    controls1,
    cameraPositionX,
    cameraPositionY,
    cameraPositionZ,
  } = initLength();
  const { scene2, renderer2, camera2, controls2 } = clipping();

  // 環境光源を作成
  const ambientLight1 = new THREE.AmbientLight(0xffffff, 0.5);
  const ambientLight2 = new THREE.AmbientLight(0xffffff, 0.5);
  scene1.add(ambientLight1);
  scene2.add(ambientLight2);

  // 平行光源を作成
  const directionalLight1 = new THREE.DirectionalLight(0xffffff);
  directionalLight1.intensity = 1;
  directionalLight1.position.set(1, 10, 1);
  const directionalLight2 = new THREE.DirectionalLight(0xffffff);
  directionalLight2.intensity = 1;
  directionalLight2.position.set(1, 10, 1);
  scene1.add(directionalLight1);
  scene2.add(directionalLight2);

  // 座標軸の表示
  // new THREE.AxesHelper(軸の長さ);
  const axis1 = new THREE.AxesHelper(300);
  const axis2 = new THREE.AxesHelper(300);
  scene1.add(axis1);
  scene2.add(axis2);

  let object2;
  // ファイル入力要素の取得
  const fileInput = document.getElementById("fileInput");
  // ファイルが選択されたときの処理
  fileInput.addEventListener("change", function (event) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (e) {
        const contents = e.target.result;

        // OBJLoaderで読み込み
        const objLoader = new THREE.OBJLoader();
        const object1 = objLoader.parse(contents);
        object2 = objLoader.parse(contents);
        object1.position.set(0, 0, 0);
        scene1.add(object1);
        object2.position.set(0, 0, 0);
        scene2.add(object2);
      };
      reader.readAsText(file);
    }
  });

  // ボタン要素の取得
  const z_length_btn = document.getElementById("z_length_btn");
  // ボタンがクリックされたときの処理
  z_length_btn.addEventListener("click", function () {
    // scene1に追加された最後のオブジェクトを取得
    const object = scene1.children[scene1.children.length - 1];
    if (object) {
      calculate_z_length(object);
    } else {
      console.log("オブジェクトがまだ読み込まれていません。");
    }
  });

  // z軸方向の骨の長さを計算
  function calculate_z_length(object) {
    const boundingBox = new THREE.Box3().setFromObject(object);
    const min = boundingBox.min;
    // 骨の長さはz軸のマイナス方向の値なので絶対値にする処理を施す
    const z_length = Math.abs(min.z);
    // z軸方向の長さをhtmlファイル(ブラウザ)に表示
    const output_z_length = document.getElementById("z_length");
    output_z_length.innerHTML = `${z_length.toFixed(4)}`;
  }

  // 断面の輪郭情報を格納する変数
  let clippedEdges = [];
  // clippingを使用して断面を取得する
  let clipPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
  // clippingHelperを使用してどこでclippingしてるか可視化する
  const planeHelper = new THREE.PlaneHelper(clipPlane, 150, 0xff0000);
  scene2.add(planeHelper);
  // ボタンを押したら断面を取得
  const clipButton = document.getElementById("clipButton");
  clipButton.addEventListener("click", updateClipPlane);
  let zPosition = 0;
  function updateClipPlane() {
    zPosition = parseFloat(document.getElementById("zPosition").value);
    clipPlane.constant = zPosition;
    // scene2に追加されていオブジェクトを呼び出す
    scene2.traverse((child) => {
      // オブジェクトがメッシュであるか確認
      if (child.isMesh) {
        // 以下の二行でclippingができるように設定
        child.material.clippingPlanes = [clipPlane];
        child.material.clipIntersection = true;
        // クリッピングされたエッジを取得
        clippedEdges = getClippedEdges(child.geometry, clipPlane);
        drawOnCanvas(
          clippedEdges,
          document.getElementById("canvas3"),
          "black",
          6
        );
        drawOnCanvas(
          clippedEdges,
          document.getElementById("canvas4"),
          "black",
          6
        );
        console.log("全輪郭線分", clippedEdges);
      }
    });
  }

  // クリップされたエッジを取得する関数
  function getClippedEdges(geometry, plane) {
    const positions = geometry.attributes.position.array;
    const indices = geometry.index ? geometry.index.array : null;
    clippedEdges = [];
    if (indices) {
      // インデックスがある場合の処理
      for (let i = 0; i < indices.length; i += 3) {
        const a = indices[i];
        const b = indices[i + 1];
        const c = indices[i + 2];

        const vA = new THREE.Vector3(
          positions[a * 3],
          positions[a * 3 + 1],
          positions[a * 3 + 2]
        );
        const vB = new THREE.Vector3(
          positions[b * 3],
          positions[b * 3 + 1],
          positions[b * 3 + 2]
        );
        const vC = new THREE.Vector3(
          positions[c * 3],
          positions[c * 3 + 1],
          positions[c * 3 + 2]
        );

        const intersectionPoints = [];

        // 辺ABをチェック
        checkEdge(vA, vB, plane, intersectionPoints);
        // 辺BCをチェック
        checkEdge(vB, vC, plane, intersectionPoints);
        // 辺CAをチェック
        checkEdge(vC, vA, plane, intersectionPoints);

        if (intersectionPoints.length === 2) {
          clippedEdges.push(intersectionPoints);
        }
      }
    } else {
      // インデックスがない場合の処理
      for (let i = 0; i < positions.length; i += 9) {
        const vA = new THREE.Vector3(
          positions[i],
          positions[i + 1],
          positions[i + 2]
        );
        const vB = new THREE.Vector3(
          positions[i + 3],
          positions[i + 4],
          positions[i + 5]
        );
        const vC = new THREE.Vector3(
          positions[i + 6],
          positions[i + 7],
          positions[i + 8]
        );

        const intersectionPoints = [];

        // 辺ABをチェック
        checkEdge(vA, vB, plane, intersectionPoints);
        // 辺BCをチェック
        checkEdge(vB, vC, plane, intersectionPoints);
        // 辺CAをチェック
        checkEdge(vC, vA, plane, intersectionPoints);

        if (intersectionPoints.length === 2) {
          clippedEdges.push(intersectionPoints);
        }
      }
    }
    return clippedEdges;
  }
  // 辺の交点をチェックする関数
  function checkEdge(vA, vB, plane, intersectionPoints) {
    const dA = plane.distanceToPoint(vA);
    const dB = plane.distanceToPoint(vB);

    if (dA * dB < 0) {
      const t = dA / (dA - dB);
      const intersection = new THREE.Vector3().lerpVectors(vA, vB, t);
      intersectionPoints.push(intersection);
    }
  }

  // クリップされたエッジをキャンバスに描画する関数
  function drawOnCanvas(edges, canvas, color, scale) {
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineWidth = 3;

    // キャンバスの中心に描画するためのオフセット
    const offsetX = canvas.width / 2;
    const offsetY = canvas.height / 2;

    // 軸を描画
    drawAxesOnCanvas(ctx, offsetX, offsetY, canvas.width, canvas.height);

    ctx.strokeStyle = color;
    ctx.beginPath();
    edges.forEach((edge) => {
      let [p1, p2] = edge;
      // キャンバスの中心を原点とした座標系に変換して描画
      ctx.moveTo(p1.x * scale + offsetX, -p1.y * scale + offsetY);
      ctx.lineTo(p2.x * scale + offsetX, -p2.y * scale + offsetY);
    });
    ctx.stroke();
  }

  // x軸とy軸を描画する関数
  function drawAxesOnCanvas(ctx, offsetX, offsetY, width, height) {
    // x軸
    ctx.strokeStyle = "#FF0000"; // 赤色
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, offsetY);
    ctx.lineTo(width, offsetY);
    ctx.stroke();

    // y軸
    ctx.strokeStyle = "#00FF00"; // 緑色
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(offsetX, 0);
    ctx.lineTo(offsetX, height);
    ctx.stroke();
  }

  // *********************************************************************
  //                   任意の輪郭点から面積などを計算するプログラム
  // ***********************************************************************
  // 点列を描画する関数(配列統合後)
  function drawPointSequence(points, canvas, color, scale) {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // キャンバスをクリア
    ctx.strokeStyle = color; // 線の色
    ctx.lineWidth = 2; // 線の太さ
    ctx.beginPath(); // 点列を描画
    // キャンバスの中心に描画するためのオフセット
    const offsetX = canvas.width / 2;
    const offsetY = canvas.height / 2;
    for (let i = 0; i < points.length; i++) {
      const { x, y } = points[i];
      // 線を描画
      if (i === 0) {
        ctx.moveTo(x * scale + offsetX, -y * scale + offsetY); // 最初の点に移動
      } else {
        ctx.lineTo(x * scale + offsetX, -y * scale + offsetY); // 前の点から線を引く
      }
    }
    let { x: firstX, y: firstY } = points[0];
    ctx.lineTo(firstX * scale + offsetX, -firstY * scale + offsetY); // 最初の点に戻る
    ctx.stroke(); // 線を描画
    drawAxesOnCanvas(ctx, offsetX, offsetY, canvas.width, canvas.height);
  }

  // 座標をブラウザに表示するためにidをそれぞれ取得
  const coordinates1 = document.getElementById("coordinates1");
  // 座標をブラウザに表示する関数
  function displayCoordinates(point, coordinates) {
    if (point.length > 0) {
      const latestPoint = point[point.length - 1];
      coordinates.innerHTML = `Latest Point: x=${latestPoint.x.toFixed(
        3
      )}, y=${latestPoint.y.toFixed(3)}`;
    }
  }

  // 座標値にデフォルト値として入力
  coordinates1.innerHTML = `Latest Point: x=0.000, y=0.000`;
  // canvas3でクリックで取得した座標を格納する配列
  const points = [];
  // canvas3でクリックして座標を取得
  const canvas3 = document.getElementById("canvas3");
  const ctx = canvas3.getContext("2d");
  canvas3.addEventListener("click", getCoordinates);
  function getCoordinates(event) {
    const rect = canvas3.getBoundingClientRect();
    let x = event.clientX - rect.left;
    let y = event.clientY - rect.top;

    let centerX = x - canvas3.width / 2; // Canvasの中心のX座標
    let centerY = y - canvas3.height / 2; // Canvasの中心のY座標

    let relativeX = centerX / 6; // Canvas中心を原点とした相対X座標(scaleで割る)
    let relativeY = -(centerY / 6); // Canvas中心を原点とした相対Y座標(scaleで割る)

    points.push({ x: relativeX, y: relativeY });
    if (points.length > 3) alert("Please push reset ");
    // 赤で円を描画
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, 2 * Math.PI);
    ctx.fillStyle = "red";
    ctx.fill();
    displayCoordinates(points, coordinates1); // 座標をブラウザに表示する関数
    console.log(points);
  }

  // エッジ削除プログラム
  let filteredEdges = [];
  // let moreFilteredEdges = [];
  let clickCount = 0;
  const removeEdges = document.getElementById("removeEdges");
  removeEdges.addEventListener("click", function () {
    clickCount++;
    if (clickCount >= 2) {
      // 2回目以降のクリックで実行する処理
      filteredEdges = removeEdgesInsideTriangle2D(filteredEdges, ...points);
      drawOnCanvas(
        filteredEdges,
        document.getElementById("canvas3"),
        "black",
        6
      );
    } else {
      // 1回目のクリックで実行する処理
      filteredEdges = removeEdgesInsideTriangle2D(clippedEdges, ...points);
      drawOnCanvas(
        filteredEdges,
        document.getElementById("canvas3"),
        "black",
        6
      );
    }
    points.length = 0;
    coordinates1.innerHTML = `Latest Point: x=0.000, y=0.000`;
    console.log("抽出されたエッジ", filteredEdges);
  });

  // 三角形の内部にあるエッジを削除する関数 (z値を無視)
  function removeEdgesInsideTriangle2D(edges, v0, v1, v2) {
    return edges.filter(([start, end]) => {
      // エッジの両端点が三角形の内部にあるかチェック (z値を無視)
      let startInside = isPointInTriangle2D(start, v0, v1, v2);
      let endInside = isPointInTriangle2D(end, v0, v1, v2);

      // 両端点のいずれかが三角形の内部にある場合は削除
      return !(startInside || endInside);
    });
  }

  // 点が三角形の内部にあるかどうかを判断する関数 (z値を無視)
  // バリセンター座標を使用
  function isPointInTriangle2D(point, v0, v1, v2) {
    let alpha =
      ((v1.y - v2.y) * (point.x - v2.x) + (v2.x - v1.x) * (point.y - v2.y)) /
      ((v1.y - v2.y) * (v0.x - v2.x) + (v2.x - v1.x) * (v0.y - v2.y));
    let beta =
      ((v2.y - v0.y) * (point.x - v2.x) + (v0.x - v2.x) * (point.y - v2.y)) /
      ((v1.y - v2.y) * (v0.x - v2.x) + (v2.x - v1.x) * (v0.y - v2.y));
    let gamma = 1.0 - alpha - beta;

    return alpha > 0 && beta > 0 && gamma > 0;
  }

  // resetボタンを押した時の処理
  const reset = document.getElementById("reset");
  reset.addEventListener("click", function () {
    points.length = 0;
    coordinates1.innerHTML = `Latest Point: x=0.000, y=0.000`;
    surfaceArea.innerHTML = `0.000`;
    centroidCoordinates.innerHTML = `0.000`;
    clickCount = 0;
    // 座標系をリセット(clearRectは最終的な座標系の部分しか消さないため)
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    document
      .getElementById("canvas3")
      .getContext("2d")
      .clearRect(
        0,
        0,
        document.getElementById("canvas3").width,
        document.getElementById("canvas3").height
      );
  });

  // sortContour関数を実行した時の処理
  let filteredContour = [];
  let sortedPoints = [];
  const sortContour = document.getElementById("sortContour");
  sortContour.addEventListener("click", function () {
    //重複した点を削除する
    let flatPoints = changeFlatEdges(filteredEdges);
    console.log("重複点を削除:", flatPoints);
    // filteredContour = reconstructContour(flatPoints);距離で探索
    sortedPoints = sortPoints(flatPoints);
    console.log("ソーティング後の配列", sortedPoints);
    drawPointSequence(
      sortedPoints,
      document.getElementById("canvas3"),
      "purple",
      6
    );
  });

  function sortPoints(points) {
    // 点列の中心点を計算
    const centroid = {
      x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
      y: points.reduce((sum, p) => sum + p.y, 0) / points.length,
    };
    // 中心点からの角度で点をソートし、sortingPointsに格納
    const sortingPoints = points.slice().sort((a, b) => {
      const angleA = Math.atan2(a.y - centroid.y, a.x - centroid.x);
      const angleB = Math.atan2(b.y - centroid.y, b.x - centroid.x);
      return angleA - angleB;
    });
    // ソートされた点列を返す
    return sortingPoints;
  }

  //線分情報を点情報に変換して重複した点情報を削除
  function changeFlatEdges(edges) {
    // すべての点を一つの配列に統合
    const allPoints = edges.flat();
    console.log("統合した配列:", allPoints);

    // 重複した点を削除する
    const flatPoints = [];
    const seen = new Set();
    allPoints.forEach((point) => {
      const key = `${point.x},${point.y}`; // x, yの値をキーとして扱う
      if (!seen.has(key)) {
        // 同じ座標がまだセットされていない場合
        seen.add(key);
        flatPoints.push(point); // 重複なしの配列に追加
      }
    });

    return flatPoints;
  }

  // // 3次元座標間における2点間の距離を計算する関数
  // function distance3D(point1, point2) {
  //   return Math.sqrt(
  //     Math.pow(point1.x - point2.x, 2) + Math.pow(point1.y - point2.y, 2)
  //   );
  // }

  // // 最大Y座標を持つ点を見つける関数
  // function findMaxYPoint(points) {
  //   return points.reduce(
  //     (maxPoint, currentPoint) =>
  //       currentPoint.y > maxPoint.y ? currentPoint : maxPoint,
  //     points[0]
  //   );
  // }

  // // 断面を形成する点群をソーティングする関数
  // function reconstructContour(points) {
  //   if (points.length === 0) return [];
  //   const visitedPoints = []; // 訪れた点を記録する配列(ソーティング後の配列)
  //   let currentPoint = findMaxYPoint(points); // 最大Y座標を持つ点から開始
  //   console.log("統合した配列の最大Y:", currentPoint);
  //   visitedPoints.push(currentPoint); // 最初の点を訪れた点に追加

  //   // 探索ループ：全ての点を訪問するまで繰り返す
  //   while (visitedPoints.length < points.length) {
  //     // 現在の点から最も近い未探索の点を探す
  //     let nearestPoint = null;
  //     let minDistance = Infinity;

  //     // 任意の点Pから一番近い点を探索するためのループ
  //     // for文はその区間の処理が全て終わらないと次の処理に行かない→allPointsのi=3とかでif(nearestPoint)に行かない
  //     points.forEach((point) => {
  //       if (!visitedPoints.includes(point)) {
  //         const dist = distance3D(currentPoint, point);
  //         if (dist < minDistance) {
  //           minDistance = dist;
  //           nearestPoint = point;
  //         }
  //       }
  //     });
  //     // 最も近い点を訪問リストに追加し、現在の点を更新
  //     if (nearestPoint) {
  //       //nearestPointがnullでないか確認
  //       visitedPoints.push(nearestPoint);
  //       currentPoint = nearestPoint;
  //     }
  //   }
  //   return visitedPoints;
  // }

  // シューの公式を使用して面積を計算する関数(配列統合後)
  function calculatePolygonArea(points) {
    let area = 0;
    const n = points.length;
    for (let i = 0; i < n; i++) {
      const { x: x1, y: y1 } = points[i];
      const { x: x2, y: y2 } = points[(i + 1) % n]; // 次の点、最後は最初の点と結ぶ
      area += x1 * y2 - x2 * y1;
    }
    return Math.abs(area) / 2;
  }

  // 面積部分を塗りつぶす関数(配列統合後)
  function fillArea(points, canvas, scale) {
    const ctx = canvas.getContext("2d");
    const offsetX = canvas.width / 2;
    const offsetY = canvas.height / 2;
    ctx.beginPath();
    ctx.moveTo(points[0].x * scale + offsetX, -points[0].y * scale + offsetY);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x * scale + offsetX, -points[i].y * scale + offsetY);
    }
    ctx.closePath();
    ctx.fillStyle = "rgba(0, 255, 255, 0.5)";
    ctx.fill(); // 閉鎖空間を黒く塗りつぶす
  }

  // 画面出力値にデフォルト値を入力
  const surfaceArea = document.getElementById("surfaceArea");
  surfaceArea.innerHTML = `0.000`;
  const centroidCoordinates = document.getElementById("centroidCoordinates");
  centroidCoordinates.innerHTML = `0.000`;
  const InertiaMomentX = document.getElementById("InertiaMomentX");
  InertiaMomentX.innerHTML = `0.000`;
  const InertiaMomentY = document.getElementById("InertiaMomentY");
  InertiaMomentY.innerHTML = `0.000`;

  // 面積を計算するためのボタンを取得
  let area = 0;
  const Area = document.getElementById("calculateArea");
  Area.addEventListener("click", function () {
    area = calculatePolygonArea(sortedPoints);
    fillArea(sortedPoints, document.getElementById("canvas3"), 6);
    surfaceArea.innerHTML = `${area.toFixed(3)}`;
  });

  // 重心を格納する
  let centroid = [];
  const firstMomentOfArea = document.getElementById("firstMomentOfArea");
  firstMomentOfArea.addEventListener("click", function () {
    centroid = calculateCentroid(sortedPoints, area);
    console.log("重心:", centroid);
    // 図心を描画
    ctx.beginPath();
    ctx.arc(
      centroid.x * 6 + canvas3.width / 2,
      -centroid.y * 6 + canvas3.height / 2,
      4,
      0,
      2 * Math.PI
    );
    ctx.fillStyle = "black";
    ctx.fill();
    centroidCoordinates.innerHTML = `${centroid.x.toFixed(
      3
    )}, ${centroid.y.toFixed(3)}`;
  });

  // 角度変化値を読み込んで断面二次モーメントを計算
  let momentOfInertia = 0;
  const SecondMomentOfArea = document.getElementById("SecondMomentOfArea");
  SecondMomentOfArea.addEventListener("click", function () {
    let angleInput = 0;
    angleInput = document.getElementById("angleInput").value;
    let angle = parseFloat(angleInput); // 入力された角度を取得
    // drawStick(angle, centroid, canvas3); // 入力された角度で棒を描画
    momentOfInertia = calculateMomentOfInertiaAroundCentroid(
      sortedPoints,
      centroid,
      angle
    );
    InertiaMomentX.innerHTML = `${momentOfInertia.Ix.toFixed(3)}`;
    InertiaMomentY.innerHTML = `${momentOfInertia.Iy.toFixed(3)}`;
    console.log("Ix:", momentOfInertia.Ix);
    console.log("Ix_rotated:", momentOfInertia.Ix_rotated);
  });

  // 棒を描画する関数
  // function drawStick(angleInDegrees, point, canvas) {
  //   const stickLength = 300; // 棒の長さ（例：5cm）
  //   // 重心を中心に棒を並行移動
  //   ctx.translate(
  //     centroid.x * 6 + canvas.width / 2,
  //     -centroid.y * 6 + canvas.height / 2
  //   );
  //   // y軸を反転させる(translateでそもそもy軸が反転しているから)
  //   ctx.scale(1, -1); // y軸の反転
  //   // 回転の指定
  //   ctx.rotate((angleInDegrees * Math.PI) / 180); // 角度をラジアンに変換して回転
  //   // 棒を描く（長さ100pxの線）
  //   ctx.beginPath();
  //   ctx.moveTo(-stickLength / 2, 0); // 棒の始点を中心から-25pxに
  //   ctx.lineTo(stickLength / 2, 0); // 棒の終点を中心から+25pxに
  //   ctx.strokeStyle = "blue";
  //   ctx.lineWidth = 5;
  //   ctx.stroke();
  //   ctx.restore();
  // }

  // 断面一次モーメントを用いて図心を求める
  // 断面一次モーメントSは下記で求められる
  //                  x軸まわり Sx=∮ydA=Gy*A      Gy:図形の重心y座標, dA:微小面積, A:図形の全体面積
  //                  y軸まわり Sy=∮xdA=Gx*A      Gx:図形の重心x座標
  // step1:SxとSyを求める(積分計算で)
  // step2:重心座標を求める Gy=Sx/a
  function calculateCentroid(points, area) {
    let Sx = 0; // y軸に関する断面一次モーメント
    let Sy = 0; // x軸に関する断面一次モーメント
    // 点列データを用いて断面一次モーメントを計算
    for (let i = 0; i < points.length - 1; i++) {
      const x0 = points[i].x;
      const y0 = points[i].y;
      const x1 = points[i + 1].x;
      const y1 = points[i + 1].y;
      // 多角形の辺ごとの微小三角形の面積を計算
      const crossProduct = x0 * y1 - x1 * y0;
      // 断面一次モーメントの計算、(y0 + y1)には+0が省略さており重心を表す
      Sx += (y0 + y1) * crossProduct;
      Sy += (x0 + x1) * crossProduct;
    }
    // 最後の点と最初の点で計算を閉じる
    const x0 = points[points.length - 1].x;
    const y0 = points[points.length - 1].y;
    const x1 = points[0].x;
    const y1 = points[0].y;
    const crossProduct = x0 * y1 - x1 * y0;
    Sx += (y0 + y1) * crossProduct;
    Sy += (x0 + x1) * crossProduct;
    // 全体の断面一次モーメントの合計値を面積で割って重心座標を計算
    const Gx = Sy / (6 * area);
    const Gy = Sx / (6 * area);
    return { x: Gx, y: Gy };
  }

  // 重心周りの断面二次モーメントを計算する
  function calculateMomentOfInertiaAroundCentroid(
    points,
    centroid,
    angleInDegrees
  ) {
    let Ix = 0; // x軸に関する断面二次モーメント
    let Iy = 0; // y軸に関する断面二次モーメント
    let Ixy = 0; // x, y軸に関する断面二次モーメント（ねじれ成分）
    // ラジアンに変換
    const angleInRadians = (angleInDegrees * Math.PI) / 180;

    // 点列を重心座標系に並行移動し、モーメントを計算
    for (let i = 0; i < points.length - 1; i++) {
      // 現在の点と次の点を取得
      const x0 = points[i].x - centroid.x;
      const y0 = points[i].y - centroid.y;
      const x1 = points[i + 1].x - centroid.x;
      const y1 = points[i + 1].y - centroid.y;

      // 外積を使って微小エリアを計算（多角形の部分面積として）
      const crossProduct = 0.5 * (x0 * y1 - x1 * y0);

      // 各軸に関する断面二次モーメントを計算
      Ix += (y0 * y0 + y0 * y1 + y1 * y1) * crossProduct;
      Iy += (x0 * x0 + x0 * x1 + x1 * x1) * crossProduct;
      Ixy += (x0 * y1 + 2 * x0 * y0 + 2 * x1 * y1 + x1 * y0) * crossProduct;
    }

    // 最後の点と最初の点で計算を閉じる
    const x0 = points[points.length - 1].x - centroid.x;
    const y0 = points[points.length - 1].y - centroid.y;
    const x1 = points[0].x - centroid.x;
    const y1 = points[0].y - centroid.y;
    const crossProduct = 0.5 * (x0 * y1 - x1 * y0);

    Ix += (y0 * y0 + y0 * y1 + y1 * y1) * crossProduct;
    Iy += (x0 * x0 + x0 * x1 + x1 * x1) * crossProduct;
    Ixy += (x0 * y1 + 2 * x0 * y0 + 2 * x1 * y1 + x1 * y0) * crossProduct;

    // スケーリング（1/36で割る）
    Ix /= 36;
    Iy /= 36;
    Ixy /= 72;

    // 回転後の断面二次モーメントを計算
    const Ix_rotated =
      Ix * Math.cos(angleInRadians) ** 2 +
      Iy * Math.sin(angleInRadians) ** 2 -
      2 * Ixy * Math.sin(angleInRadians) * Math.cos(angleInRadians);
    const Iy_rotated =
      Ix * Math.sin(angleInRadians) ** 2 +
      Iy * Math.cos(angleInRadians) ** 2 +
      2 * Ixy * Math.sin(angleInRadians) * Math.cos(angleInRadians);
    const Ixy_rotated =
      (Iy - Ix) * Math.sin(angleInRadians) * Math.cos(angleInRadians) +
      Ixy * (Math.cos(angleInRadians) ** 2 - Math.sin(angleInRadians) ** 2);

    return { Ix_rotated, Iy_rotated, Ixy_rotated, Ix, Iy };
  }

  // テーブルに計算結果を表示させるプログラム
  let tableRowCount = 0;
  const addRowTotable = document.getElementById("addRowTotable");
  addRowTotable.addEventListener("click", function () {
    tableRowCount++; // tableに表示させるNo
    let tableRowArea = area.toFixed(3); //tableに表示させる面積値
    addRowToTable(
      tableRowCount,
      zPosition,
      tableRowArea,
      centroid,
      momentOfInertia
    ); // 結果をテーブルに追加
  });

  // テーブルにカラムを追加する関数
  function addRowToTable(count, valueZposition, valueArea, point, inertia) {
    // テーブルのtbody部分を取得
    let tableBody = document
      .getElementById("resultTable")
      .getElementsByTagName("tbody")[0];

    // 新しい行を作成
    let newRow = tableBody.insertRow(); // insertRow() で新しい行を追加
    // 新しいセルを作成してデータを追加
    let cell1 = newRow.insertCell(0); // 回数セル
    let cell2 = newRow.insertCell(1); // z値セル
    let cell3 = newRow.insertCell(2); // 面積計算結果セル
    let cell4 = newRow.insertCell(3); // 重心
    let cell5 = newRow.insertCell(4); //x軸周りの二次モーメント
    let cell6 = newRow.insertCell(5); //y軸周りの二次モーメント
    let cell7 = newRow.insertCell(6);
    cell1.innerHTML = count; //回数を設定
    cell2.innerHTML = valueZposition; //z値
    cell3.innerHTML = valueArea; //計算結果を設定
    cell4.innerHTML = `${point.x.toFixed(2)},${point.y.toFixed(2)}`; //重心
    cell5.innerHTML = inertia.Ix.toFixed(2);
    cell6.innerHTML = inertia.Iy.toFixed(2);
    // 削除ボタンを作成してセルに追加
    const deleteButton = document.createElement("button");
    deleteButton.textContent = "delete";
    deleteButton.addEventListener("click", function () {
      // 行を削除
      newRow.remove(); // newRow自体を削除
    });
    cell7.appendChild(deleteButton);
  }

  // Excelにエクスポートする関数
  const exportButton = document.getElementById("exportButton");
  exportButton.addEventListener("click", function () {
    // テーブルを取得
    const table = document.getElementById("resultTable");
    // テーブルをExcelブックとしてエクスポート
    const workbook = XLSX.utils.table_to_book(table, { sheet: "Sheet1" });
    // Excelファイルとして保存
    XLSX.writeFile(workbook, "result.xlsx");
  });

  // *********************************************************************
  //                   デジタイズ点を楕円近似するプログラム
  // ***********************************************************************
  // canvas4でクリックで取得した座標を格納する配列
  let points2 = [];
  // canvas4でクリックして座標を取得
  const canvas4 = document.getElementById("canvas4");
  const ctx4 = canvas4.getContext("2d");
  canvas4.addEventListener("click", function (event) {
    const rect = canvas4.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const centerX = x - canvas4.width / 2; // Canvasの中心のX座標
    const centerY = y - canvas4.height / 2; // Canvasの中心のY座標

    const relativeX = centerX / 6; // Canvas中心を原点とした相対X座標(scaleで割る)
    const relativeY = -(centerY / 6); // Canvas中心を原点とした相対Y座標(scaleで割る)

    if (points2.length > 14) {
      //配列が10個以上になったらデジタイズできないようにする。配列は０番目も含まれる
      alert("over 15 points ");
    } else {
      points2.push({ x: relativeX, y: relativeY });
      console.log("point2", points2);
    }
    // 赤で円を描画
    ctx4.beginPath();
    ctx4.arc(x, y, 2, 0, 2 * Math.PI);
    ctx4.fillStyle = "red";
    ctx4.fill();
    displayCoordinates(points2, coordinates2); // 座標をブラウザに表示する関数
    console.log(points);
  });

  // 座標をブラウザに表示するためにidをそれぞれ取得
  const coordinates2 = document.getElementById("coordinates2");
  // デフォルト値として代入
  coordinates2.innerHTML = `Latest Point: x=0.000, y=0.000`;
  // 楕円近似用のresetボタンの処理
  const reset2 = document.getElementById("reset2");
  reset2.addEventListener("click", function () {
    points2.length = 0;
    coordinates2.innerHTML = `Latest Point: x=0.000, y=0.000`;
    ellipseArea.innerHTML = `0.000`;
    ellipseInertiaX.innerHTML = `0.000`;
    ellipseInertiaY.innerHTML = `0.000`;
    clickCount = 0;
    document
      .getElementById("canvas4")
      .getContext("2d")
      .clearRect(
        0,
        0,
        document.getElementById("canvas4").width,
        document.getElementById("canvas4").height
      );
  });

  // 楕円の面積をブラウザに表示
  const ellipseArea = document.getElementById("ellipseArea");
  ellipseArea.innerHTML = `0.000`;
  // 楕円のx軸周りの二次モーメントをブラウザに表示
  const ellipseInertiaX = document.getElementById("ellipseInertiaX");
  ellipseInertiaX.innerHTML = `0.000`;
  // 楕円のy軸周りの二次モーメントをブラウザに表示
  const ellipseInertiaY = document.getElementById("ellipseInertiaY");
  ellipseInertiaY.innerHTML = `0.000`;

  // ボタンを押したら楕円近似する
  const ellipse = document.getElementById("ellipse");
  ellipse.addEventListener("click", function () {
    if (points2.length === 15) {
      let ellipse = fitEllipse(points2);
      let area = calculateEllipseArea(ellipse.radiusX, ellipse.radiusY);
      let I_x = calculateMomentOfInertiaX(ellipse.radiusX, ellipse.radiusY);
      let I_y = calculateMomentOfInertiaY(ellipse.radiusX, ellipse.radiusY);
      let [I_x_prime, I_y_prime] = transformMoments(I_x, I_y, ellipse.rotation);
      drawEllipse(
        ctx4,
        ellipse.centerX * 6,
        ellipse.centerY * 6,
        ellipse.radiusX * 6,
        ellipse.radiusY * 6,
        ellipse.rotation,
        6
      );
      // 面積値をブラウザに表示
      ellipseArea.innerHTML = `${area.toFixed(3)}`;
      // 断面二次モーメント値をブラウザに表示
      ellipseInertiaX.innerHTML = `${I_x_prime.toFixed(3)}`;
      ellipseInertiaY.innerHTML = `${I_y_prime.toFixed(3)}`;
    } else {
      alert("15個の座標が必要です");
    }
  });

  // 楕円近似の関数
  function fitEllipse(points) {
    let sumX = 0,
      sumY = 0,
      sumXX = 0,
      sumYY = 0,
      sumXY = 0;
    const n = points.length;

    for (let point of points) {
      sumX += point.x;
      sumY += point.y;
      sumXX += point.x * point.x;
      sumYY += point.y * point.y;
      sumXY += point.x * point.y;
    }

    const avgX = sumX / n;
    const avgY = sumY / n;
    const varX = sumXX / n - avgX * avgX;
    const varY = sumYY / n - avgY * avgY;
    const covXY = sumXY / n - avgX * avgY;

    const lambda =
      (varX + varY) / 2 + Math.sqrt(((varX - varY) / 2) ** 2 + covXY ** 2);
    const angle = Math.atan2(lambda - varX, covXY);

    const a = Math.sqrt(
      2 *
        (varX * Math.cos(angle) ** 2 +
          2 * covXY * Math.sin(angle) * Math.cos(angle) +
          varY * Math.sin(angle) ** 2)
    );
    const b = Math.sqrt(
      2 *
        (varX * Math.sin(angle) ** 2 -
          2 * covXY * Math.sin(angle) * Math.cos(angle) +
          varY * Math.cos(angle) ** 2)
    );

    return {
      centerX: avgX,
      centerY: avgY,
      radiusX: a,
      radiusY: b,
      rotation: angle,
    };
  }

  // 楕円の面積を計算;
  function calculateEllipseArea(width, height) {
    return Math.PI * width * height;
  }

  // 楕円の断面二次モーメント I_x を計算する関数
  function calculateMomentOfInertiaX(a, b) {
    return (Math.PI * a * Math.pow(b, 3)) / 4;
  }

  // 楕円の断面二次モーメント I_y を計算する関数
  function calculateMomentOfInertiaY(a, b) {
    return (Math.PI * b * Math.pow(a, 3)) / 4;
  }

  // 楕円の回転を考慮して断面二次モーメントを変換する関数
  function transformMoments(I_x, I_y, theta) {
    const cosTheta = Math.cos(theta);
    const sinTheta = Math.sin(theta);

    const I_x_prime =
      (I_x * cosTheta ** 4 + I_y * sinTheta ** 4) / 2 +
      ((I_x - I_y) * sinTheta ** 2 * cosTheta ** 2) / 2;

    const I_y_prime =
      (I_x * sinTheta ** 4 + I_y * cosTheta ** 4) / 2 +
      ((I_x - I_y) * sinTheta ** 2 * cosTheta ** 2) / 2;

    return [I_x_prime, I_y_prime];
  }

  // 楕円を描画する関数
  function drawEllipse(ctx, x, y, a, b, rotation, scale) {
    // キャンバスの中心を原点とした座標系に変換
    const centerX = ctx.canvas.width / 2;
    const centerY = ctx.canvas.height / 2;
    ctx.save(); // 現在の描画状態を保存
    ctx.translate(centerX, centerY); // キャンバスの中心を原点に移動
    ctx.scale(1, 1); // y座標を反転させるようにスケーリング

    ctx.beginPath();
    ctx.save();
    ctx.translate(x, -y); // 楕円の中心座標を適切に変換
    ctx.rotate(-rotation);
    ctx.scale(a, b);
    ctx.arc(0, 0, 1, 0, 2 * Math.PI, false);
    ctx.restore();
    ctx.strokeStyle = "blue";
    ctx.stroke();

    ctx.restore(); // 描画状態を元に戻す

    // 点を描画
    ctx.fillStyle = "blue";
    for (let point of points) {
      ctx.beginPath();
      ctx.arc(point.x * scale, -point.y * scale, 3, 0, 2 * Math.PI);
      ctx.fill();
    }
  }

  tick();

  // 画面をレンダリング(アニメーション)
  function tick() {
    controls1.update();
    controls2.update();
    cameraPositionX.innerHTML = `X:${camera1.position.x.toFixed(2)}`;
    cameraPositionY.innerHTML = `Y:${camera1.position.y.toFixed(2)}`;
    cameraPositionZ.innerHTML = `Z:${camera1.position.z.toFixed(2)}`;
    renderer1.render(scene1, camera1);
    renderer2.render(scene2, camera2);
    requestAnimationFrame(tick);
  }
}
