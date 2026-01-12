import os
import sys
import torch
import numpy as np
import cv2
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from PIL import Image
import tempfile
import uuid
from werkzeug.utils import secure_filename
import json
import gzip
import io
import base64  # 添加base64库用于pako兼容的解压处理
import time
import math

# 添加当前目录到路径
currentpath = os.getcwd().replace('\\', '/')
ROOT_DIR = os.path.abspath(currentpath)
sys.path.append(ROOT_DIR)

# 从stl.py导入所需函数
from stl import (
    floyd_steinberg_dither_vectorized,
    depth_to_pointcloud,
    depth_to_pointcloud_with_confidence,
    depth_to_pointcloud_with_confidence_upsampled,  # 导入新的支持上采样的函数
    process_coordinates
)

# 导入VGGT模型和工具
from vggt.models.vggt import VGGT
from vggt.utils.load_fn import load_and_preprocess_images
from vggt.utils.pose_enc import pose_encoding_to_extri_intri

app = Flask(__name__)
CORS(app)

# 配置
UPLOAD_FOLDER = 'uploads'
PROCESSED_FOLDER = 'processed'
MODEL_PATH = "E:/image2point/VGGT-1B/model.pt"  # 根据需要调整此路径

# 每个数据包的最大点数
MAX_POINTS_PER_PACKET = 1000000

# 创建必要的目录
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(PROCESSED_FOLDER, exist_ok=True)

# 全局变量
device = "cuda" if torch.cuda.is_available() else "cpu"
model = None


def load_model():
    """加载VGGT模型"""
    global model
    if model is None:
        print(f"正在从 {MODEL_PATH} 加载VGGT模型...")
        model = VGGT()
        model.load_state_dict(torch.load(MODEL_PATH, map_location=device))
        model.eval()
        model = model.to(device)
        print("模型加载成功.")


def load_and_process_image(image_path, target_size=None):
    """加载并处理图像，可选择调整大小"""
    img = Image.open(image_path).convert('RGB')
    
    # 如果提供了目标尺寸，则调整大小
    if target_size is not None:
        # target_size应该是(height, width)格式
        target_height, target_width = target_size
        
        # 获取原始尺寸
        original_width, original_height = img.size
        
        # 计算缩放比例以确保图像完全覆盖目标区域
        scale = max(target_width / original_width, target_height / original_height)
        
        # 计算新尺寸
        new_width = int(original_width * scale)
        new_height = int(original_height * scale)
        
        # 调整图像大小
        img = img.resize((new_width, new_height), Image.LANCZOS)
        
        # 居中裁剪
        left = (new_width - target_width) // 2
        top = (new_height - target_height) // 2
        right = left + target_width
        bottom = top + target_height
        
        img = img.crop((left, top, right, bottom))
    
    img_np = np.array(img)
    gray_img = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY) / 255.0
    dithered_binary = floyd_steinberg_dither_vectorized(gray_img, show_image=False)
    
    return img_np, dithered_binary


def run_model(image_path):
    """
    在单个图像上运行VGGT模型并返回预测结果。
    """
    global model
    
    if model is None:
        load_model()
    
    model = model.to(device)
    model.eval()

    images = load_and_preprocess_images([image_path]).to(device)
    print(f"预处理后的图像形状: {images.shape}")

    print("正在运行推理...")
    dtype = torch.bfloat16 if torch.cuda.is_available() and torch.cuda.get_device_capability()[0] >= 8 else torch.float16

    with torch.no_grad():
        with torch.cuda.amp.autocast(dtype=dtype):
            predictions = model(images)

    extrinsic, intrinsic = pose_encoding_to_extri_intri(predictions["pose_enc"], images.shape[-2:])
    predictions["extrinsic"] = extrinsic
    predictions["intrinsic"] = intrinsic

    for key in predictions.keys():
        if isinstance(predictions[key], torch.Tensor):
            predictions[key] = predictions[key].cpu().numpy().squeeze(0)

    torch.cuda.empty_cache()
    return predictions


@app.route('/pointcloud', methods=['POST'])
def convert_to_pointcloud():
    """
    将上传的图像转换为深度图、置信度图和抖动掩码，并将结果以JSON格式返回。
    """
    try:
        # 检查请求中是否包含图像文件
        if 'image' not in request.files:
            return jsonify({'error': '未提供图像文件'}), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({'error': '未选择图像文件'}), 400
        
        # 保存上传的文件
        filename = secure_filename(file.filename)
        unique_filename = f"{uuid.uuid4()}_{filename}"
        file_path = os.path.join(UPLOAD_FOLDER, unique_filename)
        file.save(file_path)
        
        # 处理图像
        print(f"正在处理图像: {file_path}")
        
        # 运行模型获取预测结果
        predictions = run_model(file_path)
        
        # 获取深度图尺寸
        depth_map = predictions["depth"]
        if isinstance(depth_map, torch.Tensor):
            depth_map = depth_map.cpu().numpy()
        
        # 确保正确的深度图尺寸
        if depth_map.ndim == 5:
            H_depth, W_depth = depth_map.shape[2:4]  # (B, S, H, W, 1)
        elif depth_map.ndim == 4:
            H_depth, W_depth = depth_map.shape[1:3]  # (B, H, W, 1)
        elif depth_map.ndim == 3:
            H_depth, W_depth = depth_map.shape[:2]   # (H, W, C)
        else:  # ndim == 2
            H_depth, W_depth = depth_map.shape       # (H, W)
        
        upsample_factor = 1.0
        # 如果需要上采样，调整目标尺寸
        if upsample_factor > 1:
            H_depth = int(H_depth * upsample_factor)
            W_depth = int(W_depth * upsample_factor)
            print(f"上采样后目标尺寸: {H_depth} x {W_depth}")
        
        print(f"深度图尺寸: {H_depth} x {W_depth}")
        
        # 处理图像，目标尺寸与深度图匹配
        img_rgb, dither_mask = load_and_process_image(file_path, target_size=(H_depth, W_depth))

        cv2.imwrite(f"{file_path}_dither_mask.png", dither_mask * 255)
        
        # 获取置信度图
        depth_conf = predictions["depth_conf"]
        if isinstance(depth_conf, torch.Tensor):
            depth_conf = depth_conf.cpu().numpy()
        
        if depth_conf.ndim == 5:
            depth_conf = depth_conf.squeeze(4)
        print(f"[调试] 置信度图最终形状: {depth_conf.shape}")
        
        # 使用新的函数生成深度图和置信度图
        depth_map, confidence_map = points_to_depth_map(predictions, (H_depth, W_depth), "test_depth_from_predictions.jpg")

        depth_map = depth_map * 70 * upsample_factor
        
        # 获取相机参数
        intrinsic = predictions["intrinsic"]
        extrinsic = predictions["extrinsic"]
        
        if isinstance(intrinsic, torch.Tensor):
            intrinsic = intrinsic.cpu().numpy()
        if isinstance(extrinsic, torch.Tensor):
            extrinsic = extrinsic.cpu().numpy()
        
        # 生成唯一的文件ID
        file_id = str(uuid.uuid4())
        
        # 准备JSON数据
        json_data = {
            'depth_map': depth_map.tolist(),
            'confidence_map': confidence_map.tolist(),
            'dither_mask': dither_mask.tolist(),
            'intrinsic': intrinsic.tolist(),
            'extrinsic': extrinsic.tolist(),
            'depth_map_shape': list(depth_map.shape),
            'confidence_map_shape': list(confidence_map.shape),
            'dither_mask_shape': list(dither_mask.shape),
            'intrinsic_shape': list(intrinsic.shape),
            'extrinsic_shape': list(extrinsic.shape)
        }
        
        # 保存JSON数据到文件
        json_file_path = os.path.join(PROCESSED_FOLDER, f"{file_id}_data.json")
        with open(json_file_path, 'w', encoding='utf-8') as f:
            json.dump(json_data, f, ensure_ascii=False, indent=2)
        
        # 返回结果
        result = {
            'file_id': file_id,
            'data_type': 'json',
            'depth_map_shape': list(depth_map.shape),
            'confidence_map_shape': list(confidence_map.shape),
            'dither_mask_shape': list(dither_mask.shape),
            'intrinsic_shape': list(intrinsic.shape),
            'extrinsic_shape': list(extrinsic.shape)
        }
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/pointcloud/data/<file_id>', methods=['GET'])
def get_pointcloud_data(file_id):
    """
    根据文件ID下载深度图、置信度图和抖动掩码数据（JSON格式）
    """
    try:
        json_file_path = os.path.join(PROCESSED_FOLDER, f"{file_id}_data.json")
        
        if not os.path.exists(json_file_path):
            return jsonify({'error': '数据文件不存在'}), 404
            
        return send_file(
            json_file_path,
            mimetype='application/json',
            as_attachment=True,
            download_name=f'pointcloud_data_{file_id}.json'
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/pointcloud/cleanup/<file_id>', methods=['DELETE'])
def cleanup_pointcloud_file(file_id):
    """
    清理点云数据文件（可选）
    """
    try:
        json_file_path = os.path.join(PROCESSED_FOLDER, f"{file_id}_data.json")
        
        if os.path.exists(json_file_path):
            os.remove(json_file_path)
            return jsonify({'message': '文件已清理'}), 200
        else:
            return jsonify({'message': '文件不存在'}), 404
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
def points_to_depth_map(predictions, image_shape, output_path=None):
    """
    直接使用模型predictions生成与指定image_shape一致的深度图和置信度图
    
    注意：VGGT模型输出的深度图已经是经过相机内参矫正的深度值，表示每个像素点到相机平面的垂直距离。
    这些深度值可以直接用于3D点云重建，无需额外的内参矫正。
    
    Args:
        predictions: 模型输出的预测结果字典
        image_shape: 目标图像形状 (height, width)
        output_path: 深度图保存路径，可选
    
    Returns:
        depth_map: 深度图 (H, W) numpy数组
        confidence_map: 置信度图 (H, W) numpy数组
    """
    target_h, target_w = image_shape[:2]
    
    # 获取模型输出的深度图和置信度图
    # VGGT模型输出的深度图是物理意义上的深度值（单位通常是米），已经经过内参矫正
    # 深度值表示从相机光心到场景中对应点的欧几里得距离在相机光轴上的投影
    depth_map = predictions["depth"]
    confidence_map = predictions["depth_conf"]
    
    # 确保输入是numpy数组
    if isinstance(depth_map, torch.Tensor):
        depth_map = depth_map.cpu().numpy()
    if isinstance(confidence_map, torch.Tensor):
        confidence_map = confidence_map.cpu().numpy()
    
    # 去除多余的维度
    
    depth_map = depth_map.squeeze(0)
    depth_map = depth_map.squeeze(2)
    confidence_map = confidence_map.squeeze(0)

    conf_np = confidence_map
    print(f"[调试] 置信度值范围: 最小={conf_np.min():.4f}, 最大={conf_np.max():.4f}, 平均={conf_np.mean():.4f}")
    
    if conf_np.max() > 1.0:
        print(f"[调试] 置信度值超过1.0，自动归一化到0-1范围")
        confidence_map = confidence_map / conf_np.max()
    
    print(f"原始深度图尺寸: {depth_map.shape}")
    print(f"目标图像尺寸: {target_h} x {target_w}")
    
    # 如果尺寸不匹配，则进行插值调整
    if depth_map.shape[0] != target_h or depth_map.shape[1] != target_w:
        # 调整深度图尺寸
        depth_resized = cv2.resize(depth_map, (target_w, target_h), interpolation=cv2.INTER_LINEAR)
        # 调整置信度图尺寸
        confidence_resized = cv2.resize(confidence_map, (target_w, target_h), interpolation=cv2.INTER_LINEAR)
        
        depth_map = depth_resized
        confidence_map = confidence_resized
        print(f"调整后深度图尺寸: {depth_map.shape}")
    
    # 保存深度图为图像文件
    if output_path:
        # 处理深度图以便可视化
        # 只对有效深度值进行归一化
        valid_depth_mask = depth_map > 0
        if np.any(valid_depth_mask):
            min_depth = np.min(depth_map[valid_depth_mask])
            max_depth = np.max(depth_map[valid_depth_mask])
            if max_depth > min_depth:
                depth_normalized = np.zeros_like(depth_map)
                depth_normalized[valid_depth_mask] = ((depth_map[valid_depth_mask] - min_depth) / 
                                                     (max_depth - min_depth) * 255).astype(np.uint8)
            else:
                depth_normalized = np.zeros_like(depth_map, dtype=np.uint8)
        else:
            depth_normalized = np.zeros_like(depth_map, dtype=np.uint8)

        # 保存图像
        cv2.imwrite(output_path, depth_normalized)
        print(f"深度图已保存到: {output_path}")
    
    return depth_map, confidence_map


@app.route('/health', methods=['GET'])
def health_check():
    """健康检查端点"""
    return jsonify({'status': 'healthy', 'device': device})


if __name__ == '__main__':
    # 启动时加载模型
    load_model()
    app.run(host='0.0.0.0', port=5001, debug=True)


