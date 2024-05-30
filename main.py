import moderngl_window
import numpy as np
from typing import Any

def import_string(path):
	with open(path, 'r') as f:
		return f.read()

class Window(moderngl_window.WindowConfig):
	title = "Fractal"
	gl_version = (4, 6)
	window_size = (540, 540)
	aspect_ratio = None
	resizable = False
	
	cam_x = 0
	cam_y = 0
	zoom = 1.0
	dot_mass = 0.1
	zoom_level = 0
	grid_lines = False
	inputs: set[Any] = set()
	
	def __init__(self, **kwargs):
		super().__init__(**kwargs)
		self.prog = self.ctx.program(
			vertex_shader = import_string('shaders/shader.vert'),
			fragment_shader = import_string('shaders/shader.frag'),
		)
		
		vertices = np.array([
			0.0, 20.0,
			-10.0, -10.0,
			10.0, -10.0
		], dtype='f4')

		self.vbo = self.ctx.buffer(vertices)
		self.vao = self.ctx.simple_vertex_array(self.prog, self.vbo, 'in_vert') # type: ignore
	
	def render(self, time, frame_time):
		if self.wnd.keys.SPACE in self.inputs:
			self.set_zoom(self.zoom_level + frame_time * 5)
		
		if self.wnd.keys.UP in self.inputs:
			self.dot_mass += frame_time / 5
			print(self.dot_mass)
		
		if self.wnd.keys.DOWN in self.inputs:
			self.dot_mass -= frame_time / 5
			print(self.dot_mass)
		
		self.prog['camOffset'] = (self.cam_x, self.cam_y)
		self.prog['zoom'] = self.zoom
		self.prog['resolution'] = self.wnd.size
		self.prog['dotMass'] = self.dot_mass
		self.prog['gridLines'] = self.grid_lines
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
			if key == self.wnd.keys.G:
				self.grid_lines = not self.grid_lines
			if key == self.wnd.keys.F:
				self.wnd.fullscreen = not self.wnd.fullscreen
		if action == self.wnd.keys.ACTION_PRESS:
			self.inputs.add(key)
		elif action == self.wnd.keys.ACTION_RELEASE:
			self.inputs.remove(key)
	
Window.run()