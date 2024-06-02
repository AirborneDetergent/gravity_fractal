import math
from typing import Any

import moderngl_window
import numpy as np

def import_string(path):
	with open(path, 'r') as f:
		return f.read()

class Window(moderngl_window.WindowConfig):
	title = "Fractal"
	gl_version = (4, 6)
	window_size = (1280, 720)
	aspect_ratio = None
	resizable = False
	
	cam_x = 0
	cam_y = 0
	zoom = 1.0
	dot_mass = 0.1
	zoom_level = 0
	inputs: set[Any] = set()
	inputs_toggled: set[Any] = set()
	
	def __init__(self, **kwargs):
		super().__init__(**kwargs)
		
		self.fractal_shader = self.ctx.compute_shader(import_string('shaders/fractal.comp'))
		self.blur_shader = self.ctx.compute_shader(import_string('shaders/blur.comp'))
		
		self.screen_shader = self.ctx.program(
			vertex_shader = import_string('shaders/shader.vert'),
			fragment_shader = import_string('shaders/shader.frag'),
		)
		
		self.albedo = self.ctx.texture(self.window_size, 4)
		self.height = self.ctx.texture(self.window_size, 1, dtype='f4')
		self.height_swap = self.ctx.texture(self.window_size, 1, dtype='f4')
		
		vertices = np.array([
			0.0, 20.0,
			-10.0, -10.0,
			10.0, -10.0
		], dtype='f4')

		self.vbo = self.ctx.buffer(vertices)
		self.vao = self.ctx.simple_vertex_array(self.screen_shader, self.vbo, 'in_vert') # type: ignore
	
	def render(self, total_time, frame_time):
		print(int(frame_time * 1000))
		if self.wnd.keys.SPACE in self.inputs:
			self.set_zoom(self.zoom_level + frame_time * 5)
		
		if self.wnd.keys.UP in self.inputs:
			self.dot_mass += frame_time / 5
			print(self.dot_mass)
		
		if self.wnd.keys.DOWN in self.inputs:
			self.dot_mass -= frame_time / 5
			print(self.dot_mass)
		
		self.albedo.bind_to_image(0)
		self.fractal_shader['albedo'] = 0
		self.height.bind_to_image(1)
		self.fractal_shader['height'] = 1
		self.fractal_shader['resolution'] = self.wnd.size
		self.fractal_shader['camOffset'] = (self.cam_x, self.cam_y)
		self.fractal_shader['zoom'] = self.zoom
		self.fractal_shader['resolution'] = self.wnd.size
		self.fractal_shader['dotMass'] = self.dot_mass
		self.fractal_shader['gridLines'] = self.wnd.keys.G in self.inputs_toggled
		self.fractal_shader.run(math.ceil(self.window_size[0] / 32), math.ceil(self.window_size[1] / 32))
		
		if self.wnd.keys.B in self.inputs_toggled:
			self.height_swap.bind_to_image(2)
			self.blur_shader['resolution'] = self.wnd.size
			self.blur_shader['axis'] = 0
			self.blur_shader['height'] = 1
			self.blur_shader['height_swap'] = 2
			self.blur_shader.run(math.ceil(self.window_size[0] / 32), math.ceil(self.window_size[1] / 32))
			self.blur_shader['axis'] = 1
			self.blur_shader['height'] = 2
			self.blur_shader['height_swap'] = 1
			self.blur_shader.run(math.ceil(self.window_size[0] / 32), math.ceil(self.window_size[1] / 32))
		
		self.albedo.use(0)
		self.screen_shader['albedo'] = 0
		self.screen_shader['height'] = 1
		self.screen_shader['resolution'] = self.wnd.size
		self.screen_shader['is3D'] = self.wnd.keys.NUMBER_3 in self.inputs_toggled
		self.screen_shader['isWhite'] = self.wnd.keys.W in self.inputs_toggled
		self.screen_shader['sunDir'] = (math.cos(total_time / 5), math.sin(total_time / 5), 1)
		self.vao.render()
		
	def mouse_drag_event(self, x, y, dx, dy):
		speed = 2.0 * self.zoom / self.wnd.size[1]
		self.cam_x -= dx * speed
		self.cam_y += dy * speed
		
	def mouse_scroll_event(self, x_offset, y_offset):
		self.set_zoom(self.zoom_level + y_offset)
		
	def set_zoom(self, zoom_level):
		self.zoom_level = zoom_level
		self.zoom = 0.8 ** self.zoom_level
		
	def key_event(self, key, action, modifiers):
		if action == self.wnd.keys.ACTION_PRESS:
			self.inputs.add(key)
			if key in self.inputs_toggled:
				self.inputs_toggled.remove(key)
			else:
				self.inputs_toggled.add(key)
		elif action == self.wnd.keys.ACTION_RELEASE:
			try:
				self.inputs.remove(key)
			except KeyError:
				pass
	
Window.run()